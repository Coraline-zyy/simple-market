export const UNIVERSITIES = [
 {name:"UCL",domains:["ucl.ac.uk"]}, {name:"LSE",domains:["lse.ac.uk"]},
 {name:"Imperial College London",domains:["imperial.ac.uk","ic.ac.uk"]},
 {name:"King’s College London",domains:["kcl.ac.uk"]}, {name:"UAL",domains:["arts.ac.uk"]},
 {name:"City St George’s",domains:["citystgeorges.ac.uk","city.ac.uk","sgul.ac.uk"]},
 {name:"Queen Mary University of London",domains:["qmul.ac.uk"]}, {name:"Kingston University",domains:["kingston.ac.uk"]},
];
export function universityForEmail(email:string){
 const parts=email.trim().toLowerCase().split("@");if(parts.length!==2||!parts[0]||/\s/.test(email))return null;
 const domain=parts[1];return UNIVERSITIES.find(u=>u.domains.includes(domain)||(u.name==="Queen Mary University of London"&&/^[a-z]{2}[0-9]{2}\.qmul\.ac\.uk$/.test(domain)))?.name??null;
}
