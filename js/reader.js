/* Reader state and safe content lookup. UI is rendered by the application shell. */
(function(){
  "use strict";
  window.YESReader={
    open(id){const item=window.YESContent&&window.YESContent.get(id);if(!item)return false;window.YESRouter.go("read",id);return true;},
    async remember(id){if(!window.YESContent.get(id))return;await window.YESStorage.put("history",{id,contentId:id,readAt:new Date().toISOString()});},
    async saveNote(contentId,text){if(!window.YESContent.get(contentId))throw new Error("اثر پیدا نشد");await window.YESStorage.put("notes",{id:contentId,contentId,text:String(text),updatedAt:new Date().toISOString()});}
  };
})();