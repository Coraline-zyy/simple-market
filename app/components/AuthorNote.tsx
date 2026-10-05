export default function AuthorNote({lang}:{lang:"zh"|"en"}){
 const zh=lang==="zh";
 return <aside className="rounded-3xl border border-white/10 bg-[#11131e]/55 p-6 text-left lg:p-8">
  <h2 className="text-2xl font-black text-white">{zh?"作者的话":"A note from the creator"}</h2>
  <div className="mt-5 space-y-4 text-sm leading-7 text-zinc-400">
   <p>{zh?"没有人希望只是为了取回落在办公室的文件或钥匙，就不得不专程跑一趟，打乱原本的休息时间。当项目难题让你焦头烂额时，你也许缺的，只是他人的一句点拨。":"No one wants to make a special trip just to retrieve keys or a document left at the office, disrupting the time they had set aside to rest. When a project problem becomes overwhelming, sometimes all you need is one helpful piece of advice."}</p>
   <p>{zh?"对你而言费时费力的问题，对附近的另一个人来说，可能只是顺手之劳。很多人愿意帮助你，只是过去缺少一个让你提出需求、也让他们看见需求的平台。":"A problem that costs you time and effort may be a simple favour for someone nearby. Many people are willing to help—you may simply have lacked a place where you could ask and they could see what was needed."}</p>
   <p>{zh?"我创立这个平台，是希望让你把更多时间留给自己的生活：把需要解决的问题交给合适的人，也让愿意伸出援手的人在闲暇之余获得合理回报。":"I created this platform so you can keep more time for your own life: leave a problem with the right person, while allowing those willing to help to earn a fair reward in their spare time."}</p>
   <p>{zh?"货物运输、商品代买、房屋清洁、上门做饭、接送客人、游戏陪练或代练……无论需求大小，都可以在这里提出来。发挥你的想象力，提出任何要求。":"Delivering goods, buying something on your behalf, cleaning, cooking at home, collecting a guest, or helping with a game—large or small, you can post what you need here. Let your imagination guide you—ask for whatever you need."}</p>
   <p className="font-medium text-zinc-200">{zh?"欢迎在这里发布您的需求，也欢迎分享您能提供的服务。平台的初衷，是帮助人们拥有更从容的生活，因此不收取服务费。":"Post what you need here, or share a service you can offer. The platform was created to help people live with more time and ease, so it charges no service fee."}</p>
  </div>
 </aside>
}
