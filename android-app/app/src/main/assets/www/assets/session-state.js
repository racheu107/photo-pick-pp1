/* Reconcile grades by file identity while retaining the existing numeric UI IDs. */
(() => {
  const grade = value => ['skip','keep','best'].includes(value);
  const revision = descriptor => `${descriptor.key || descriptor.path}:${descriptor.size}:${descriptor.mtime}`;
  const legacyRevision = descriptor => `${descriptor.path}:${descriptor.size}:${descriptor.mtime}`;
  const records = snapshot => {
    const result = Object.create(null);
    if (!snapshot) return result;
    Object.entries(snapshot.photoRatings || {}).forEach(([key,value]) => { if (grade(value)) result[key]=value; });
    snapshot.descriptors.forEach((descriptor,id) => { if (grade(snapshot.ratings[id])) result[revision(descriptor)]=snapshot.ratings[id]; else delete result[revision(descriptor)]; });
    return result;
  };
  window.photoSessionSnapshot = () => ({
    photoRatings: records(state), selectionIdentity:state.selectionIdentity || '',
    inputKind:state.inputKind || '', savePending:!!state.savePending,
    resumeScreen:['pick','summary','transfer','ready'].includes(state.screen) ? state.screen : state.resumeScreen || 'groups',
    resumePhotoKey:modalId!==null && state.descriptors[modalId] ? revision(state.descriptors[modalId]) : '',
  });
  const baseConfirm=confirmCandidate, baseActivate=activateCandidate;
  let restoreAfterRead=false;
  confirmCandidate = candidate => {
    if (saved?.dataset==='real' && candidate.dataset==='real') {
      const previous=records(saved), legacy=new Map();
      saved.descriptors.forEach((d,id)=>{const key=legacyRevision(d); legacy.set(key,legacy.has(key)?null:id);});
      const sameSource=!!candidate.selectionIdentity && candidate.selectionIdentity===saved.selectionIdentity;
      const legacySource=!saved.selectionIdentity && candidate.folderName===saved.folderName && candidate.descriptors.some(d=>legacy.has(legacyRevision(d)));
      const overlappingFiles=candidate.inputKind==='files' && saved.inputKind==='files' && candidate.descriptors.some(d=>Object.hasOwn(previous,revision(d)));
      const exact=JSON.stringify(saved.descriptors)===JSON.stringify(candidate.descriptors);
      if (sameSource || legacySource || overlappingFiles || exact) {
        const ratings={};
        candidate.descriptors.forEach((d,id)=>{
          let value=previous[revision(d)];
          if (!value && legacySource) { const old=legacy.get(legacyRevision(d)); if(old!==null && old!==undefined) value=saved.ratings[old]; }
          if (grade(value)) ratings[id]=value;
        });
        const previousFile=saved.descriptors[saved.index];
        const moved=previousFile ? candidate.descriptors.findIndex(d=>revision(d)===revision(previousFile) || (legacySource && legacyRevision(d)===legacyRevision(previousFile))) : -1;
        saved={...saved,descriptors:candidate.descriptors,ratings,index:moved>=0?moved:0,history:exact?saved.history:[],previewHistory:exact?saved.previewHistory:[],photoRatings:previous};
        activateCandidate(candidate,true); return;
      }
    }
    baseConfirm(candidate);
    const cancel=layer.querySelector('#close-sheet');
    if(cancel && layer.querySelector('#confirm-new') && candidate.readId) {
      const previous=cancel.onclick;
      cancel.onclick=()=>{previous();window.PhotoPickAndroid?.discardSelection?.(candidate.readId);};
    }
  };
  activateCandidate = (candidate,same) => {
    const old=same ? saved : null;
    baseActivate(candidate,same);
    if (candidate.dataset==='real') {
      state.selectionIdentity=candidate.selectionIdentity || old?.selectionIdentity || '';
      state.inputKind=candidate.inputKind || old?.inputKind || '';
      if(candidate.readId) window.PhotoPickAndroid?.acceptSelection?.(candidate.readId);
      if (restoreAfterRead && old) {
        state.screen=['summary','ready','transfer'].includes(old.resumeScreen)?'summary':old.reviewDates?.length?'pick':'groups';
        const focus=old.resumePhotoKey ? state.descriptors.findIndex(d=>revision(d)===old.resumePhotoKey) : -1;
        restoreAfterRead=false;persist();render();
        if(focus>=0 && state.screen==='pick' && !old.savePending) openPhoto(focus);
        if(old.savePending) { state.savePending=false;persist();window.photoSessionNotice?.('이전 저장이 중단됐어요. 결과 화면에서 다시 저장하면 이미 저장한 사진은 건너뛰어요.'); }
      } else { restoreAfterRead=false;persist(); }
    }
  };
  ['onNativeCancel','onNativeError'].forEach(name=>{const previous=window[name];window[name]=result=>{restoreAfterRead=false;previous?.(result);};});
  const reconnect=()=>{
    const device=window.PhotoPickAndroid;
    if(saved?.dataset!=='real' || sourcePhotos.length || !device?.resumeSelection)return false;
    restoreAfterRead=true;
    if(!saved.inputKind && saved.descriptors.every(d=>d.path.startsWith('content://')) && device.resumeFiles)
      device.resumeFiles(JSON.stringify(saved.descriptors.map(d=>d.path)));
    else device.resumeSelection();
    return true;
  };
  const baseBind=bind;
  bind=()=>{baseBind();const resume=app.querySelector('#resume');if(resume){const previous=resume.onclick;resume.onclick=()=>{if(!reconnect())previous?.();};}};
  document.addEventListener('photopick-opening-complete',reconnect,{once:true});
  if(!document.querySelector('#brand-opening')) reconnect();
})();
