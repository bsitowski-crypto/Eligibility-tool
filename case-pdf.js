(function(){
  "use strict";

  const PAGE_WIDTH=792;
  const PAGE_HEIGHT=612;
  const MARGIN=22;
  const HEADER_BOTTOM=566;
  const CONTENT_TOP=542;
  const CONTENT_BOTTOM=28;
  const CONTENT_HEIGHT=CONTENT_TOP-CONTENT_BOTTOM;
  const CONTENT_WIDTH=PAGE_WIDTH-(MARGIN*2);
  const COLUMN_GAP=14;
  // The case narrative is usually much denser than the pull list. Give it
  // more room while keeping the supply quantity column easy to scan.
  const LEFT_WIDTH=430;
  const RIGHT_X=MARGIN+LEFT_WIDTH+COLUMN_GAP;
  const RIGHT_WIDTH=CONTENT_WIDTH-LEFT_WIDTH-COLUMN_GAP;

  function clean(value){
    return String(value??"")
      .replace(/[\u2010-\u2015]/g,"-")
      .replace(/\u2022/g,"-")
      .replace(/[^\x20-\x7E]/g,"?")
      .replace(/\s+/g," ")
      .trim();
  }

  function wrapText(font,value,size,maxWidth){
    const text=clean(value);
    if(!text)return [];
    const lines=[];
    let current="";

    function pushLongWord(word){
      let chunk="";
      for(const character of word){
        const candidate=chunk+character;
        if(chunk&&font.widthOfTextAtSize(candidate,size)>maxWidth){
          lines.push(chunk);
          chunk=character;
        }else{
          chunk=candidate;
        }
      }
      current=chunk;
    }

    for(const word of text.split(" ")){
      if(!current){
        if(font.widthOfTextAtSize(word,size)>maxWidth)pushLongWord(word);
        else current=word;
        continue;
      }
      const candidate=current+" "+word;
      if(font.widthOfTextAtSize(candidate,size)<=maxWidth){
        current=candidate;
      }else{
        lines.push(current);
        current="";
        if(font.widthOfTextAtSize(word,size)>maxWidth)pushLongWord(word);
        else current=word;
      }
    }
    if(current)lines.push(current);
    return lines;
  }

  function normalizeSections(data){
    return (data.sections||[]).map(section=>{
      const groups=(section.groups||[]).map(group=>({
        label:clean(group.label),
        items:(group.items||[]).map(clean).filter(Boolean)
      })).filter(group=>group.label);
      const labels=new Set(groups.map(group=>group.label.toLowerCase()));
      return {
        title:clean(section.title),
        rows:(section.rows||[]).map(clean).filter(Boolean),
        groups,
        sideColumns:["left","middle","right"].every(label=>labels.has(label))
      };
    }).filter(section=>section.title);
  }

  function normalizeSupplies(data){
    return (data.supplies||[]).map(item=>({
      name:clean(item.name),
      qty:clean(item.qty)
    })).filter(item=>item.name);
  }

  function layoutConfig(size){
    return {
      size,
      infoSize:size,
      infoLine:size+1.9,
      itemSize:Math.max(size-.15,4.6),
      itemLine:size+1.7,
      groupSize:size+.15,
      groupLine:size+1.9,
      sectionSize:size+1.15,
      sectionLine:size+2.3,
      supplySize:size,
      supplyLine:size+1.9,
      supplyHeaderSize:size+.3,
      sectionGap:4,
      rowPad:2.4
    };
  }

  function sectionHeaderHeight(title,width,cfg,bold){
    const lines=wrapText(bold,title.toUpperCase(),cfg.sectionSize,width-12);
    return Math.max(14,(Math.max(lines.length,1)*cfg.sectionLine)+4);
  }

  function gridHeight(values,width,size,lineHeight,rowPad,regular,prefix){
    const cellWidth=(width-8)/2;
    let height=0;
    for(let index=0;index<values.length;index+=2){
      const left=wrapText(regular,(prefix||"")+values[index],size,cellWidth-5);
      const right=index+1<values.length?
        wrapText(regular,(prefix||"")+values[index+1],size,cellWidth-5):[];
      height+=Math.max(left.length,right.length,1)*lineHeight+rowPad;
    }
    return height;
  }

  function sideColumnsHeight(groups,width,cfg,fonts){
    const gap=8;
    const columnWidth=(width-(gap*2))/3;
    const byLabel=new Map(groups.map(group=>[group.label.toLowerCase(),group]));
    const ordered=["left","middle","right"].map(label=>
      byLabel.get(label)||{label,items:[]}
    );
    const headerHeight=Math.max(...ordered.map(group=>
      Math.max(wrapText(fonts.bold,group.label.toUpperCase(),cfg.groupSize,columnWidth-6).length,1)*cfg.groupLine
    ))+2;

    function splitItems(items){
      const index=items.findIndex(item=>String(item).trim().toUpperCase()==="PFO");
      return index<0
        ?{standard:items,pfo:[]}
        :{standard:items.slice(0,index),pfo:items.slice(index+1)};
    }

    function itemsHeight(items){
      return items.reduce((sum,item)=>{
        const lines=wrapText(fonts.regular,"- "+item,cfg.itemSize,columnWidth-6);
        return sum+(Math.max(lines.length,1)*cfg.itemLine)+1.2;
      },0);
    }

    const split=ordered.map(group=>splitItems(group.items));
    const standardHeight=Math.max(...split.map(group=>itemsHeight(group.standard)),0);
    const hasPfo=split.some(group=>group.pfo.length);
    const pfoHeight=hasPfo
      ?cfg.groupLine+3+Math.max(...split.map(group=>itemsHeight(group.pfo)),0)
      :0;
    return headerHeight+standardHeight+pfoHeight+2;
  }

  function measureCase(sections,cfg,fonts){
    let height=0;
    for(const section of sections){
      height+=sectionHeaderHeight(section.title,LEFT_WIDTH,cfg,fonts.bold)+2;
      height+=gridHeight(
        section.rows,LEFT_WIDTH,cfg.infoSize,cfg.infoLine,
        cfg.rowPad,fonts.regular,""
      );
      if(section.sideColumns){
        height+=sideColumnsHeight(section.groups,LEFT_WIDTH-4,cfg,fonts);
      }else{
        for(const group of section.groups){
          const labelLines=wrapText(
            fonts.bold,group.label.toUpperCase(),cfg.groupSize,LEFT_WIDTH-8
          );
          height+=Math.max(labelLines.length,1)*cfg.groupLine+1;
          height+=gridHeight(
            group.items,LEFT_WIDTH-8,cfg.itemSize,cfg.itemLine,
            1.2,fonts.regular,"- "
          );
        }
      }
      height+=cfg.sectionGap;
    }
    return height;
  }

  function supplyRowHeight(item,width,cfg,fonts){
    const qtyWidth=42;
    const nameLines=wrapText(
      fonts.regular,item.name,cfg.supplySize,width-qtyWidth-12
    );
    const qtyLines=wrapText(
      fonts.bold,item.qty,cfg.supplySize,qtyWidth-5
    );
    return Math.max(nameLines.length,qtyLines.length,1)*cfg.supplyLine+4;
  }

  function bestSupplySplit(supplies,width,cfg,fonts){
    const heights=supplies.map(item=>supplyRowHeight(item,width,cfg,fonts));
    const total=heights.reduce((sum,value)=>sum+value,0);
    let left=0;
    let best={index:Math.ceil(supplies.length/2),height:Infinity};
    for(let index=1;index<supplies.length;index++){
      left+=heights[index-1];
      const height=Math.max(left,total-left);
      if(height<best.height)best={index,height};
    }
    return best;
  }

  function measureSupplies(supplies,cfg,fonts){
    const titleHeight=18;
    const headerHeight=15;
    const oneRows=supplies.reduce(
      (sum,item)=>sum+supplyRowHeight(item,RIGHT_WIDTH,cfg,fonts),0
    );
    if(titleHeight+headerHeight+oneRows<=CONTENT_HEIGHT){
      return {columns:1,split:supplies.length,height:titleHeight+headerHeight+oneRows};
    }

    const width=(RIGHT_WIDTH-8)/2;
    const best=bestSupplySplit(supplies,width,cfg,fonts);
    return {
      columns:2,
      split:best.index,
      height:titleHeight+headerHeight+best.height
    };
  }

  function chooseLayout(sections,supplies,fonts){
    for(let size=8.2;size>=4.8;size-=.2){
      const cfg=layoutConfig(Number(size.toFixed(1)));
      const leftHeight=measureCase(sections,cfg,fonts);
      const supplyLayout=measureSupplies(supplies,cfg,fonts);
      if(leftHeight<=CONTENT_HEIGHT&&supplyLayout.height<=CONTENT_HEIGHT){
        return {cfg,leftHeight,supplyLayout};
      }
    }

    throw new Error(
      "The case contains too much text to fit legibly on one page. Shorten any long Other notes and try again."
    );
  }

  async function embedMascot(pdf,mascot){
    if(!mascot)return null;
    let bytes=mascot.imageBytes||null;
    if(!bytes&&mascot.imageUrl){
      const response=await fetch(mascot.imageUrl,{cache:"force-cache"});
      if(!response.ok)throw new Error("Animal portrait returned "+response.status);
      bytes=await response.arrayBuffer();
    }
    return bytes?pdf.embedPng(bytes):null;
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
    const fonts={regular,bold};
    const navy=rgb(7/255,31/255,62/255);
    const blue=rgb(11/255,99/255,206/255);
    const purple=rgb(111/255,66/255,193/255);
    const ink=rgb(28/255,28/255,30/255);
    const muted=rgb(90/255,90/255,96/255);
    const line=rgb(214/255,214/255,220/255);
    const pale=rgb(247/255,247/255,249/255);
    const white=rgb(1,1,1);
    const donor=clean(data.donor||"Case document");
    const generated=clean(data.generated||new Date().toLocaleString());
    const sections=normalizeSections(data);
    const supplies=normalizeSupplies(data);
    const layout=chooseLayout(sections,supplies,fonts);
    const cfg=layout.cfg;
    let mascotImage=null;
    try{mascotImage=await embedMascot(pdf,data.mascot)}catch(err){
      console.warn("Case PDF animal portrait",err);
    }

    // The case document intentionally has exactly one landscape letter page.
    const page=pdf.addPage([PAGE_WIDTH,PAGE_HEIGHT]);
    page.drawRectangle({x:0,y:HEADER_BOTTOM,width:PAGE_WIDTH,height:PAGE_HEIGHT-HEADER_BOTTOM,color:navy});
    page.drawText("PDX RECOVERY PLANNER",{
      x:MARGIN,y:PAGE_HEIGHT-28,size:14,font:bold,color:white
    });
    const header="CASE DOCUMENT";
    const mascotSize=34;
    const mascotX=PAGE_WIDTH-MARGIN-mascotSize;
    const mascotLabel=data.mascot
      ?clean(data.mascot.label).toUpperCase()+" - REV "+
        Math.max(1,Number.parseInt(data.mascot.revision,10)||1)
      :"";
    const headerRight=mascotLabel?mascotX-12:PAGE_WIDTH-MARGIN;
    page.drawText(header,{
      x:headerRight-bold.widthOfTextAtSize(header,9.2),
      y:PAGE_HEIGHT-27,size:9.2,font:bold,color:white
    });
    if(mascotImage){
      page.drawImage(mascotImage,{
        x:mascotX,y:PAGE_HEIGHT-5-mascotSize,
        width:mascotSize,height:mascotSize
      });
    }
    if(mascotLabel){
      const mascotLabelSize=5.2;
      page.drawText(mascotLabel,{
        x:PAGE_WIDTH-MARGIN-bold.widthOfTextAtSize(mascotLabel,mascotLabelSize),
        y:HEADER_BOTTOM+1.8,size:mascotLabelSize,font:bold,color:white
      });
    }

    const donorLines=wrapText(bold,donor,8.7,420);
    donorLines.slice(0,2).forEach((text,index)=>page.drawText(text,{
      x:MARGIN,y:HEADER_BOTTOM-12-(index*9.2),size:8.7,font:bold,color:navy
    }));
    const prepared="Prepared "+generated;
    page.drawText(prepared,{
      x:PAGE_WIDTH-MARGIN-regular.widthOfTextAtSize(prepared,6.8),
      y:HEADER_BOTTOM-12,size:6.8,font:regular,color:muted
    });

    page.drawLine({
      start:{x:MARGIN+LEFT_WIDTH+(COLUMN_GAP/2),y:CONTENT_BOTTOM},
      end:{x:MARGIN+LEFT_WIDTH+(COLUMN_GAP/2),y:CONTENT_TOP},
      thickness:.7,color:line
    });

    function drawSectionHeader(title,x,width,y){
      const lines=wrapText(bold,title.toUpperCase(),cfg.sectionSize,width-12);
      const height=sectionHeaderHeight(title,width,cfg,bold);
      page.drawRectangle({x,y:y-height+3,width,height,color:pale});
      page.drawRectangle({x,y:y-height+3,width:3,height,color:purple});
      lines.forEach((text,index)=>page.drawText(text,{
        x:x+7,y:y-cfg.sectionSize-(index*cfg.sectionLine),
        size:cfg.sectionSize,font:bold,color:navy
      }));
      return y-height-2;
    }

    function drawGrid(values,x,width,y,size,lineHeight,rowPad,color,prefix){
      const cellGap=8;
      const cellWidth=(width-cellGap)/2;
      for(let index=0;index<values.length;index+=2){
        const pair=[values[index],values[index+1]];
        const lineSets=pair.map(value=>value?
          wrapText(regular,(prefix||"")+value,size,cellWidth-5):[]);
        const rowHeight=Math.max(lineSets[0].length,lineSets[1].length,1)*lineHeight+rowPad;
        lineSets.forEach((lines,column)=>{
          lines.forEach((text,lineIndex)=>page.drawText(text,{
            x:x+(column*(cellWidth+cellGap))+3,
            y:y-size-(lineIndex*lineHeight),
            size,font:regular,color
          }));
        });
        y-=rowHeight;
        page.drawLine({
          start:{x,y:y+1.4},end:{x:x+width,y:y+1.4},
          thickness:.25,color:line
        });
      }
      return y;
    }

    function drawSideColumns(groups,x,width,y){
      const gap=8;
      const columnWidth=(width-(gap*2))/3;
      const byLabel=new Map(groups.map(group=>[group.label.toLowerCase(),group]));
      const ordered=["left","middle","right"].map(label=>
        byLabel.get(label)||{label,items:[]}
      );
      const headerSets=ordered.map(group=>
        wrapText(bold,group.label.toUpperCase(),cfg.groupSize,columnWidth-6)
      );
      const headerHeight=Math.max(...headerSets.map(lines=>Math.max(lines.length,1)*cfg.groupLine))+2;

      headerSets.forEach((lines,column)=>lines.forEach((text,index)=>page.drawText(text,{
        x:x+(column*(columnWidth+gap))+3,
        y:y-cfg.groupSize-(index*cfg.groupLine),
        size:cfg.groupSize,font:bold,color:blue
      })));

      const itemTop=y-headerHeight;
      const split=ordered.map(group=>{
        const index=group.items.findIndex(item=>String(item).trim().toUpperCase()==="PFO");
        return index<0
          ?{standard:group.items,pfo:[]}
          :{standard:group.items.slice(0,index),pfo:group.items.slice(index+1)};
      });

      function drawItems(items,column,columnY){
        const columnX=x+(column*(columnWidth+gap));
        let currentY=columnY;
        for(const item of items){
          const lines=wrapText(regular,"- "+item,cfg.itemSize,columnWidth-6);
          lines.forEach((text,index)=>page.drawText(text,{
            x:columnX+3,y:currentY-cfg.itemSize-(index*cfg.itemLine),
            size:cfg.itemSize,font:regular,color:ink
          }));
          const rowHeight=(Math.max(lines.length,1)*cfg.itemLine)+1.2;
          currentY-=rowHeight;
          page.drawLine({
            start:{x:columnX,y:currentY+1.2},
            end:{x:columnX+columnWidth,y:currentY+1.2},
            thickness:.25,color:line
          });
        }
        return currentY;
      }

      const standardBottoms=split.map((group,column)=>
        drawItems(group.standard,column,itemTop)
      );
      let bottom=Math.min(...standardBottoms,itemTop);

      if(split.some(group=>group.pfo.length)){
        const pfoHeaderHeight=cfg.groupLine+3;
        page.drawRectangle({
          x,y:bottom-pfoHeaderHeight+1,width,height:pfoHeaderHeight,color:pale
        });
        page.drawRectangle({
          x,y:bottom-pfoHeaderHeight+1,width:2,height:pfoHeaderHeight,color:purple
        });
        page.drawText("PFO",{
          x:x+5,y:bottom-cfg.groupSize-1,
          size:cfg.groupSize,font:bold,color:blue
        });
        const pfoTop=bottom-pfoHeaderHeight;
        const pfoBottoms=split.map((group,column)=>
          drawItems(group.pfo,column,pfoTop)
        );
        bottom=Math.min(...pfoBottoms,pfoTop);
      }

      bottom-=2;
      for(let column=1;column<3;column++){
        const lineX=x+(column*columnWidth)+((column-.5)*gap);
        page.drawLine({
          start:{x:lineX,y:y+1},end:{x:lineX,y:bottom+1},
          thickness:.3,color:line
        });
      }
      return bottom;
    }

    let caseY=CONTENT_TOP;
    if(!sections.length){
      page.drawText("No case details were generated.",{
        x:MARGIN+3,y:caseY-cfg.infoSize,size:cfg.infoSize,font:regular,color:muted
      });
    }
    for(const section of sections){
      caseY=drawSectionHeader(section.title,MARGIN,LEFT_WIDTH,caseY);
      caseY=drawGrid(
        section.rows,MARGIN,LEFT_WIDTH,caseY,cfg.infoSize,cfg.infoLine,
        cfg.rowPad,ink,""
      );
      if(section.sideColumns){
        caseY=drawSideColumns(section.groups,MARGIN+2,LEFT_WIDTH-4,caseY);
      }else{
        for(const group of section.groups){
          const labelLines=wrapText(
            bold,group.label.toUpperCase(),cfg.groupSize,LEFT_WIDTH-8
          );
          labelLines.forEach((text,index)=>page.drawText(text,{
            x:MARGIN+3,y:caseY-cfg.groupSize-(index*cfg.groupLine),
            size:cfg.groupSize,font:bold,color:blue
          }));
          caseY-=Math.max(labelLines.length,1)*cfg.groupLine+1;
          caseY=drawGrid(
            group.items,MARGIN+2,LEFT_WIDTH-4,caseY,cfg.itemSize,cfg.itemLine,
            1.2,ink,"- "
          );
        }
      }
      caseY-=cfg.sectionGap;
    }

    function drawSupplyHeader(x,width,y){
      page.drawRectangle({x,y:y-13,width,height:14,color:navy});
      page.drawText("SUPPLY",{
        x:x+5,y:y-9,size:cfg.supplyHeaderSize,font:bold,color:white
      });
      const qty="QTY";
      page.drawText(qty,{
        x:x+width-5-bold.widthOfTextAtSize(qty,cfg.supplyHeaderSize),
        y:y-9,size:cfg.supplyHeaderSize,font:bold,color:white
      });
      return y-15;
    }

    function drawSupplyRows(values,x,width,y,startIndex){
      const qtyWidth=42;
      values.forEach((item,index)=>{
        const rowHeight=supplyRowHeight(item,width,cfg,fonts);
        if((startIndex+index)%2===0){
          page.drawRectangle({x,y:y-rowHeight,width,height:rowHeight,color:pale});
        }
        const nameLines=wrapText(
          regular,item.name,cfg.supplySize,width-qtyWidth-12
        );
        const qtyLines=wrapText(
          bold,item.qty,cfg.supplySize,qtyWidth-5
        );
        nameLines.forEach((text,lineIndex)=>page.drawText(text,{
          x:x+4,y:y-cfg.supplySize-(lineIndex*cfg.supplyLine),
          size:cfg.supplySize,font:regular,color:ink
        }));
        qtyLines.forEach((text,lineIndex)=>page.drawText(text,{
          x:x+width-4-bold.widthOfTextAtSize(text,cfg.supplySize),
          y:y-cfg.supplySize-(lineIndex*cfg.supplyLine),
          size:cfg.supplySize,font:bold,color:navy
        }));
        y-=rowHeight;
        page.drawLine({
          start:{x,y:y+1.2},end:{x:x+width,y:y+1.2},
          thickness:.3,color:line
        });
      });
      return y;
    }

    page.drawRectangle({
      x:RIGHT_X,y:CONTENT_TOP-15,width:RIGHT_WIDTH,height:16,color:purple
    });
    page.drawText("SUPPLIES TO PULL / LOG",{
      x:RIGHT_X+6,y:CONTENT_TOP-10,size:cfg.sectionSize,font:bold,color:white
    });
    let supplyY=CONTENT_TOP-18;
    if(!supplies.length){
      page.drawText("No supplies were generated.",{
        x:RIGHT_X+4,y:supplyY-cfg.supplySize,
        size:cfg.supplySize,font:regular,color:muted
      });
    }else if(layout.supplyLayout.columns===1){
      supplyY=drawSupplyHeader(RIGHT_X,RIGHT_WIDTH,supplyY);
      drawSupplyRows(supplies,RIGHT_X,RIGHT_WIDTH,supplyY,0);
    }else{
      const innerGap=8;
      const width=(RIGHT_WIDTH-innerGap)/2;
      const first=supplies.slice(0,layout.supplyLayout.split);
      const second=supplies.slice(layout.supplyLayout.split);
      const firstY=drawSupplyHeader(RIGHT_X,width,supplyY);
      const secondX=RIGHT_X+width+innerGap;
      const secondY=drawSupplyHeader(secondX,width,supplyY);
      drawSupplyRows(first,RIGHT_X,width,firstY,0);
      drawSupplyRows(second,secondX,width,secondY,first.length);
    }

    page.drawLine({
      start:{x:MARGIN,y:20},end:{x:PAGE_WIDTH-MARGIN,y:20},
      thickness:.5,color:line
    });
    page.drawText("Generated by PDX Recovery Planner",{
      x:MARGIN,y:9,size:6.2,font:regular,color:muted
    });
    const footer="Page 1 of 1";
    page.drawText(footer,{
      x:PAGE_WIDTH-MARGIN-bold.widthOfTextAtSize(footer,6.2),
      y:9,size:6.2,font:bold,color:muted
    });

    window.PDXCasePdf.lastLayout={
      pages:1,
      fontSize:cfg.size,
      caseHeight:Number(layout.leftHeight.toFixed(1)),
      supplyHeight:Number(layout.supplyLayout.height.toFixed(1)),
      supplyColumns:layout.supplyLayout.columns,
      mascot:data.mascot?{
        key:clean(data.mascot.key),
        revision:Math.max(1,Number.parseInt(data.mascot.revision,10)||1)
      }:null
    };
    return pdf.save();
  }

  window.PDXCasePdf={createCasePdf,lastLayout:null};
})();
