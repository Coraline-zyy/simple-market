export function verificationPrivacy(){
 const controller=process.env.VERIFICATION_CONTROLLER_NAME?.trim()||"Yiyuan Zhang";
 const region=process.env.VERIFICATION_STORAGE_REGION?.trim()||"";
 const transfers=process.env.VERIFICATION_TRANSFER_DETAILS?.trim()||"";
 const backups=process.env.VERIFICATION_BACKUP_RETENTION?.trim()||"";
 return {controller,region,transfers,backups,ready:!!(controller&&region&&transfers&&backups)};
}
