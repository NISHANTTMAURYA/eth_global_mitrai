self.addEventListener('push',event=>{
 let payload;try{payload=event.data.json();}catch{return;}
 event.waitUntil(self.registration.showNotification(payload.title||'MitrAI',{body:payload.body||'A private check-in is waiting.',tag:payload.tag,data:{url:payload.url||'/'},icon:'/brand/mitrai-icon.svg'}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const target=new URL(event.notification.data?.url||'/',self.location.origin);
 if(target.origin!==self.location.origin)return;
 event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(async windows=>{
  const existing=windows.find(w=>new URL(w.url).origin===target.origin);
  if(existing){await existing.navigate(target.href);return existing.focus();}
  return clients.openWindow(target.href);
 }));
});
