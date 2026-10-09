export function validCommunityComment(body:string,images:number) {
 const length=body.trim().length;
 return images>=0 && images<=5 && length<=5000 && (length>0 || images>0);
}
export function validCommunityPost(title:string,body:string,images:number,social:boolean) {
 const length=body.trim().length;
 return title.trim().length>=3 && title.trim().length<=160 && images>=0 && images<=5 &&
 length<=10000 && (length>=5 || (!social && images>0));
}
