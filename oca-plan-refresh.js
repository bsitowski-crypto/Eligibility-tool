(function(){
  "use strict";

  const oca=document.getElementById("oca");
  if(!oca)return;

  oca.addEventListener("change",()=>{
    // The validator reads this field live, so the choices must be screened again.
    if(document.getElementById("age")?.value.trim()){
      screenDonor();
    }
    for(const id of ["validationCard","suppliesCard","printActions"]){
      document.getElementById(id)?.classList.add("hidden");
    }
    snapshot();
  });
})();
