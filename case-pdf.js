(function(){
  "use strict";

  const PAGE_WIDTH=792;
  const PAGE_HEIGHT=612;

  function clean(value){
    return String(value??"")
      .replace(/[\u2010-\u2015]/g,"-")
      .replace(/\u2022/g,"-")
      .replace(/[^\x20-\x7E]/g,"?")
      .replace(/\s+/g," ")
      .trim();
  }

  function fitText(font,text,size,maxWidth){
    const value=clean(text);
    if(font.widthOfTextAtSize(value,size)<=maxWidth)return value;
    const suffix="...";
    let lo=0,hi=value.length;
    while(lo<hi){
      const mid=Math.ceil((lo+hi)/2);
      if(font.widthOfTextAtSize(value.slice(0,mid)+suffix,size)<=maxWidth)lo=mid;
      else hi=mid-1;
    }
    return value.slice(0,lo)+suffix;
  }

  function graftLines(groups){
    const lines=[];
    for(const group of groups||[]){
      const items=(group.items||[]).map(clean).filter(Boolean);
      if(!items.length)continue;
      lines.push({text:clean(group.label).toUpperCase(),bold:true,label:clean(group.label).toUpperCase()});
      for(const item of items)lines.push({text:"- "+item,bold:false,label:clean(group.label).toUpperCase()});
    }
    return lines;
  }

  function splitGraftLines(lines){
    if(lines.length<2)return [lines,[]];
    const at=Math.ceil(lines.length/2);
    const left=lines.slice(0,at);
    const right=lines.slice(at);
    if(right.length&& !right[0].bold){
      right.unshift({text:right[0].label,bold:true,label:right[0].label});
    }
    return [left,right];
  }

  async function createCasePdf(data){
    if(!window.PDFLib)throw new Error("The PDF generator did not load.");
    const {PDFDocument,StandardFonts,rgb}=window.PDFLib;
    const pdf=await PDFDocument.create();
    pdf.setTitle("PDX Recovery Planner - Case Document");
    pdf.setAuthor("PDX Recovery Planner");
    pdf.setSubject("Validated recovery case document and supply list");
    pdf.setCreator("PDX Recovery Planner");

    const regular=await pdf.embedFont(StandardFonts.Helvetica);
    const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
    const page=pdf.addPage([PAGE_WIDTH,PAGE_HEIGHT]);
    const navy=rgb(7/255,31/255,62/255);
    const blue=rgb(11/255,99/255,206/255);
    const purple=rgb(111/255,66/255,193/255);
    const ink=rgb(28/255,28/255,30/255);
    const muted=rgb(90/255,90/255,96/255);
    const line=rgb(214/255,214/255,220/255);
    const pale=rgb(247/255,247/255,249/255);

    page.drawRectangle({x:0,y:PAGE_HEIGHT-48,width:PAGE_WIDTH,height:48,color:navy});
    page.drawText("PDX RECOVERY PLANNER",{x:28,y:PAGE_HEIGHT-29,size:15,font:bold,color:rgb(1,1,1)});
    page.drawText("CASE DOCUMENT",{x:PAGE_WIDTH-145,y:PAGE_HEIGHT-28,size:10,font:bold,color:rgb(1,1,1)});

    const generated=clean(data.generated||new Date().toLocaleString());
    const donor=clean(data.donor||"Case document");
    page.drawText(fitText(bold,donor,10,330),{x:28,y:PAGE_HEIGHT-64,size:10,font:bold,color:navy});
    page.drawText(fitText(regular,"Prepared "+generated,7.5,250),{x:PAGE_WIDTH-278,y:PAGE_HEIGHT-63,size:7.5,font:regular,color:muted});

    const leftX=28;
    const leftWidth=338;
    const dividerX=380;
    const rightX=397;
    const rightWidth=367;
    const contentTop=PAGE_HEIGHT-78;
    const contentBottom=32;

    page.drawLine({start:{x:dividerX,y:contentBottom},end:{x:dividerX,y:contentTop+5},thickness:1,color:line});

    const sections=(data.sections||[]).map(section=>({
      title:clean(section.title),
      rows:(section.rows||[]).map(clean).filter(Boolean),
      groups:(section.groups||[]).map(group=>({label:clean(group.label),items:(group.items||[]).map(clean).filter(Boolean)}))
    }));

    let estimated=0;
    for(const section of sections){
      estimated+=17;
      estimated+=Math.ceil(section.rows.length/2)*9.2;
      const gl=graftLines(section.groups);
      estimated+=Math.ceil(gl.length/2)*8.4;
    }
    const available=contentTop-contentBottom;
    const scale=Math.min(1,available/Math.max(estimated,1));
    const headingSize=Math.max(8.2,10*scale);
    const rowSize=Math.max(5.9,7.35*scale);
    const rowHeight=Math.max(7,9.2*scale);
    const groupSize=Math.max(5.8,7.1*scale);
    const groupHeight=Math.max(6.8,8.4*scale);
    const sectionGap=Math.max(5,8*scale);

    let y=contentTop;
    for(const section of sections){
      if(!section.title)continue;
      page.drawRectangle({x:leftX,y:y-3,width:leftWidth,height:headingSize+7,color:pale});
      page.drawRectangle({x:leftX,y:y-3,width:3,height:headingSize+7,color:purple});
      page.drawText(fitText(bold,section.title.toUpperCase(),headingSize,leftWidth-12),{
        x:leftX+8,y:y,size:headingSize,font:bold,color:navy
      });
      y-=headingSize+9;

      if(section.rows.length){
        const colGap=10;
        const colWidth=(leftWidth-colGap)/2;
        for(let i=0;i<section.rows.length;i+=2){
          const first=section.rows[i];
          const second=section.rows[i+1];
          page.drawText(fitText(regular,first,rowSize,colWidth-3),{x:leftX,y,size:rowSize,font:regular,color:ink});
          if(second)page.drawText(fitText(regular,second,rowSize,colWidth-3),{x:leftX+colWidth+colGap,y,size:rowSize,font:regular,color:ink});
          page.drawLine({start:{x:leftX,y:y-2},end:{x:leftX+leftWidth,y:y-2},thickness:.35,color:line});
          y-=rowHeight;
        }
      }

      const lines=graftLines(section.groups);
      if(lines.length){
        const [firstCol,secondCol]=splitGraftLines(lines);
        const colGap=12;
        const colWidth=(leftWidth-colGap)/2;
        const startY=y;
        function drawGraftColumn(items,x){
          let gy=startY;
          for(const item of items){
            const font=item.bold?bold:regular;
            const color=item.bold?blue:ink;
            page.drawText(fitText(font,item.text,groupSize,colWidth-2),{x,y:gy,size:groupSize,font,color});
            gy-=groupHeight;
          }
          return gy;
        }
        const y1=drawGraftColumn(firstCol,leftX);
        const y2=drawGraftColumn(secondCol,leftX+colWidth+colGap);
        y=Math.min(y1,y2);
      }
      y-=sectionGap;
    }

    page.drawRectangle({x:rightX,y:contentTop-3,width:rightWidth,height:17,color:navy});
    page.drawText("SUPPLIES TO PULL / LOG",{x:rightX+8,y:contentTop+1,size:9.5,font:bold,color:rgb(1,1,1)});

    const supplies=(data.supplies||[]).map(item=>({name:clean(item.name),qty:clean(item.qty)})).filter(item=>item.name);
    const perColumn=Math.max(1,Math.ceil(supplies.length/2));
    const supplyTop=contentTop-21;
    const supplyBottom=contentBottom;
    const supplyAvailable=supplyTop-supplyBottom;
    const supplyRowHeight=Math.min(10,Math.max(6.8,supplyAvailable/perColumn));
    const supplySize=Math.min(7.4,Math.max(5.5,supplyRowHeight-2));
    const supplyGap=12;
    const supplyColWidth=(rightWidth-supplyGap)/2;

    function drawSupplyColumn(items,x){
      let sy=supplyTop;
      for(let i=0;i<items.length;i++){
        const item=items[i];
        if(i%2===0)page.drawRectangle({x,y:sy-2,width:supplyColWidth,height:supplyRowHeight,color:pale});
        const qtyWidth=Math.max(22,bold.widthOfTextAtSize(item.qty,supplySize)+5);
        page.drawText(fitText(regular,item.name,supplySize,supplyColWidth-qtyWidth-7),{x:x+3,y:sy,size:supplySize,font:regular,color:ink});
        page.drawText(fitText(bold,item.qty,supplySize,qtyWidth),{x:x+supplyColWidth-qtyWidth,y:sy,size:supplySize,font:bold,color:navy});
        page.drawLine({start:{x,y:sy-2},end:{x:x+supplyColWidth,y:sy-2},thickness:.3,color:line});
        sy-=supplyRowHeight;
      }
    }

    drawSupplyColumn(supplies.slice(0,perColumn),rightX);
    drawSupplyColumn(supplies.slice(perColumn),rightX+supplyColWidth+supplyGap);

    page.drawLine({start:{x:28,y:22},end:{x:PAGE_WIDTH-28,y:22},thickness:.6,color:line});
    page.drawText("Generated by PDX Recovery Planner",{x:28,y:10,size:6.5,font:regular,color:muted});
    page.drawText("Verify case details before recovery.",{x:PAGE_WIDTH-180,y:10,size:6.5,font:regular,color:muted});

    return pdf.save();
  }

  window.PDXCasePdf={createCasePdf};
})();
