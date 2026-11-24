(() => {
  "use strict";
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const STORAGE_REPORTS = "safespace_demo_reports_v1";
  const STORAGE_NAME = "safespace_assistant_name_v1";
  let reports = loadReports();
  let activeReportId = null;
  let selectedFiles = [];
  let toastTimer;

  function loadReports(){ try { const v=JSON.parse(localStorage.getItem(STORAGE_REPORTS)||"[]"); return Array.isArray(v)?v:[]; } catch { return []; } }
  function saveReports(){ try { localStorage.setItem(STORAGE_REPORTS,JSON.stringify(reports)); updateReportCount(); return true; } catch { showToast("Storage is full. Remove a large attachment or delete old demo records."); return false; } }
  function updateReportCount(){ $("#reportCount").textContent=reports.length; }
  function showToast(message){ const t=$("#toast"); t.textContent=message; t.classList.add("show"); clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.classList.remove("show"),2600); }
  function escapeHTML(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function formatDate(value){if(!value)return "Date not specified";const d=new Date(value+"T12:00:00");return Number.isNaN(d.getTime())?value:d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});}

  function navigate(page){
    const target=$("#page-"+page); if(!target)return;
    $$(".page").forEach(p=>p.classList.toggle("active",p===target));
    $$(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
    const labels={home:"Home",report:"Report Cyberbullying",protect:"Block & Protect",support:"Emotional Support",learn:"Learn & Prevent",reports:"My Reports",assistant:"SafeSpace Assistant",about:"About SafeSpace"};
    $("#pageCrumb").textContent=labels[page]||"Home";
    $("#sidebar").classList.remove("open");
    window.scrollTo({top:0,behavior:"smooth"});
    if(page==="reports") renderReports();
    if(page==="assistant") openAssistant();
  }
  document.addEventListener("click",e=>{
    const btn=e.target.closest("[data-page]");
    if(btn){e.preventDefault();navigate(btn.dataset.page);}
  });
  $("#menuToggle").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  document.addEventListener("click",e=>{if(window.innerWidth<=760 && $("#sidebar").classList.contains("open") && !e.target.closest("#sidebar") && !e.target.closest("#menuToggle"))$("#sidebar").classList.remove("open");});
  $("#profileButton").addEventListener("click",()=>showToast("Your demo records stay in this browser. No account is connected."));

  // Report form
  const reportDate=$("#reportDate"); reportDate.max=new Date().toISOString().slice(0,10);
  $("#reportDescription").addEventListener("input",e=>$("#charCount").textContent=e.target.value.length);
  $("#reportFiles").addEventListener("change",e=>{
    selectedFiles=[...e.target.files].filter(f=>f.type.startsWith("image/"));
    $("#fileList").innerHTML=selectedFiles.map(f=>`<span class="file-chip">${escapeHTML(f.name)} · ${Math.round(f.size/1024)} KB</span>`).join("");
    if(selectedFiles.length>4){selectedFiles=selectedFiles.slice(0,4);showToast("You can attach up to 4 images.");}
    if(selectedFiles.some(f=>f.size>900*1024)){showToast("Each image must be under 900 KB for this local demo.");selectedFiles=selectedFiles.filter(f=>f.size<=900*1024);}
    $("#fileList").innerHTML=selectedFiles.map(f=>`<span class="file-chip">${escapeHTML(f.name)} · ${Math.round(f.size/1024)} KB</span>`).join("");
  });
  $("#reportForm").addEventListener("reset",()=>setTimeout(()=>{selectedFiles=[];$("#fileList").innerHTML="";$("#charCount").textContent="0";$("#reportFeedback").textContent="";},0));
  $("#reportForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const data={type:$("#reportType").value,platform:$("#reportPlatform").value,date:$("#reportDate").value,description:$("#reportDescription").value.trim()};
    if(!data.type||!data.platform||!data.description||!$("#reportConfirm").checked){$("#reportFeedback").textContent="Please complete the required fields and confirmation.";return;}
    const attachments=[];
    try{
      for(const file of selectedFiles){
        if(file.size>900*1024)continue;
        const dataUrl=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});
        attachments.push({name:file.name,dataUrl});
      }
    }catch{showToast("An image could not be read. You can save the report without it.");}
    const record={id:Date.now().toString(36)+Math.random().toString(36).slice(2,7),createdAt:new Date().toISOString(),...data,attachments};
    reports.unshift(record);
    if(saveReports()){
      $("#reportFeedback").textContent="Your demo report has been saved on this device.";
      e.target.reset();showToast("Report saved in this browser.");renderReports();
    }else{reports=reports.filter(r=>r.id!==record.id);}
  });

  // My reports
  function renderReports(){
    const q=$("#reportSearch").value.trim().toLowerCase(),filter=$("#reportFilter").value;
    let list=[...reports].filter(r=>[r.type,r.platform,r.description,r.date].join(" ").toLowerCase().includes(q));
    if(filter==="recent")list.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
    if(filter==="oldest")list.sort((a,b)=>a.createdAt.localeCompare(b.createdAt));
    if(!list.length){$("#reportsList").innerHTML=`<div class="empty-state"><span>♡</span><h3>${reports.length?"No matching reports":"Your space is clear"}</h3><p>${reports.length?"Try another search term.":"Saved demo reports will appear here."}</p>${reports.length?"":'<button class="btn btn-primary" data-page="report">Create your first report →</button>'}</div>`;return;}
    $("#reportsList").innerHTML=list.map(r=>`<article class="report-item"><div class="report-symbol">▤</div><div class="report-info"><strong>${escapeHTML(r.type)}</strong><small>${escapeHTML(r.platform)} · ${formatDate(r.date||r.createdAt.slice(0,10))} · Saved ${new Date(r.createdAt).toLocaleDateString()}</small></div><div class="report-actions"><button class="small-action" data-view="${r.id}">View details</button><button class="small-action" data-delete="${r.id}">Delete</button></div></article>`).join("");
  }
  $("#reportSearch").addEventListener("input",renderReports);$("#reportFilter").addEventListener("change",renderReports);
  $("#reportsList").addEventListener("click",e=>{
    const view=e.target.closest("[data-view]"),del=e.target.closest("[data-delete]");
    if(view)openReport(view.dataset.view);
    if(del)deleteReport(del.dataset.delete);
  });
  function openReport(id){
    const r=reports.find(x=>x.id===id);if(!r)return;activeReportId=id;
    $("#modalTitle").textContent=r.type;
    const imgs=(r.attachments||[]).map(a=>`<div class="file-chip">${escapeHTML(a.name)}</div>`).join("");
    $("#modalBody").innerHTML=`<p class="modal-body-text"><b>Platform:</b> ${escapeHTML(r.platform)}\n<b>When:</b> ${escapeHTML(formatDate(r.date))}\n<b>Saved:</b> ${escapeHTML(new Date(r.createdAt).toLocaleString())}\n\n<b>Description:</b>\n${escapeHTML(r.description)}\n\n<b>Attachments:</b> ${r.attachments?.length||0} file(s)</p><div class="file-list">${imgs}</div><p class="field-hint">This is a local demo record, not an official report.</p>`;
    $("#modalBackdrop").classList.remove("hidden");
  }
  function closeModal(){$("#modalBackdrop").classList.add("hidden");activeReportId=null;}
  function deleteReport(id){reports=reports.filter(r=>r.id!==id);saveReports();renderReports();closeModal();showToast("Demo report deleted.");}
  $("#modalClose").addEventListener("click",closeModal);$("#modalDone").addEventListener("click",closeModal);
  $("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeModal();});
  $("#modalDelete").addEventListener("click",()=>{if(activeReportId&&confirm("Delete this local demo report?"))deleteReport(activeReportId);});
  $("#deleteAllReports").addEventListener("click",()=>{if(!reports.length){showToast("There are no reports to delete.");return;}if(confirm("Delete every locally saved demo report from this browser?")){reports=[];saveReports();renderReports();showToast("All local demo reports deleted.");}});

  // Protection tips: copy actions
  $$(".copy-tip").forEach(btn=>btn.addEventListener("click",async()=>{try{await navigator.clipboard.writeText(btn.dataset.copy);showToast("Quick steps copied.");}catch{showToast(btn.dataset.copy);}}));

  // Emotional support
  const quotes=["You deserve kindness, online and everywhere else.","One difficult moment does not define your whole story.","You are allowed to ask for help. You do not have to figure everything out alone.","Your worth is not measured by likes, comments or followers.","Taking a break from a screen can be a powerful choice.","You deserve to feel respected and safe in every space.","It is okay to set boundaries. Your comfort matters.","Being kind to yourself is important, too.","You are more than what someone says about you online.","Small steps count. Reaching out is a brave and positive step."];
  let lastQuote=-1;
  $("#newQuote").addEventListener("click",()=>{let n;do{n=Math.floor(Math.random()*quotes.length)}while(n===lastQuote);lastQuote=n;$("#supportQuote").textContent=quotes[n];});

  // Learn quiz
  const quiz=[
    {q:"Someone posts a mean comment about a classmate. What is a helpful response?",a:["Forward it to more friends","Avoid joining in and check on the classmate privately","Add another mean comment"],correct:1,why:"Right. Do not amplify the hurtful content. Offer private support and tell a trusted adult if needed."},
    {q:"A person keeps sending unwanted hurtful messages. What could help?",a:["Save relevant details, block or report the account, and ask a trusted adult for help","Reply with insults","Share your password"],correct:0,why:"Good choice. Keeping a safe record, using platform tools and involving a trusted adult can help."},
    {q:"A friend tells you they are being targeted online. What should you do?",a:["Tell them they are overreacting","Post about it publicly without asking","Listen, believe them and help them reach a trusted adult"],correct:2,why:"Exactly. Listen without blaming them and support them in finding help."},
    {q:"Which action helps create a kinder online community?",a:["Ask permission before sharing someone else's photo","Share private screenshots for entertainment","Make jokes about someone's appearance"],correct:0,why:"Yes. Respecting consent and privacy helps make online spaces safer."}
  ];
  let quizIndex=0,quizScore=0,quizAnswered=false;
  function showQuiz(){const item=quiz[quizIndex];quizAnswered=false;$("#quizProgress").textContent=`Question ${quizIndex+1} of ${quiz.length}`;$("#quizQuestion").textContent=item.q;$("#quizFeedback").textContent="";$("#quizNext").disabled=true;$("#quizNext").textContent=quizIndex===quiz.length-1?"See results →":"Next question →";$("#quizOptions").innerHTML=item.a.map((a,i)=>`<button class="quiz-option" data-answer="${i}">${escapeHTML(a)}</button>`).join("");}
  $("#quizOptions").addEventListener("click",e=>{const b=e.target.closest("[data-answer]");if(!b||quizAnswered)return;quizAnswered=true;const answer=Number(b.dataset.answer),item=quiz[quizIndex];if(answer===item.correct)quizScore++;$$(".quiz-option").forEach((el,i)=>{el.disabled=true;if(i===item.correct)el.classList.add("correct");else if(i===answer)el.classList.add("incorrect");});$("#quizFeedback").textContent=item.why;$("#quizNext").disabled=false;});
  $("#quizNext").addEventListener("click",()=>{if(!quizAnswered)return;if(quizIndex<quiz.length-1){quizIndex++;showQuiz();}else{$("#quizArea").classList.add("hidden");$("#quizResult").classList.remove("hidden");$("#quizScore").textContent=`You got ${quizScore} out of ${quiz.length} questions right. Keep learning and keep choosing kindness.`;}});
  $("#quizAgain").addEventListener("click",()=>{quizIndex=0;quizScore=0;$("#quizArea").classList.remove("hidden");$("#quizResult").classList.add("hidden");showQuiz();});showQuiz();

  // SafeSpace Assistant: scripted conversation tree
  const chatNodes={
    start:{text:"Hi there! Welcome to SafeSpace. Before we begin, what would you like to call me? You can choose a name or keep “SafeSpace Assistant.”",choices:[["I'll choose a name","name"],["Keep SafeSpace Assistant","defaultName"],["What can you help with?","topics"]]},
    greeting:{text:"I'm glad you came by. You can share only what feels comfortable. What would you like help with today?",choices:[["Someone is being unkind to me online","targeted"],["I'm worried about a friend","friend"],["I want to learn about cyberbullying","learn"],["How can I protect my privacy?","privacy"],["I just need encouragement","comfort"],["I'm not sure","unsure"]]},
    targeted:{text:"I'm sorry this is happening. You do not deserve to be treated badly. Which option feels closest to what is going on?",choices:[["Hurtful messages or comments","messages"],["Rumors or embarrassing posts","rumors"],["Being left out of a group","excluded"],["Threats or feeling unsafe","threats"],["Something else","other"]]},
    messages:{text:"That can feel upsetting, especially when it keeps happening. You could avoid replying, save relevant details if it is safe, use block or report tools, and tell a trusted adult. What would help most right now?",choices:[["How do I block or report?","blockHelp"],["How can I tell an adult?","tellAdult"],["I want emotional support","comfort"],["Go back to options","greeting"]]},
    rumors:{text:"Rumors and humiliating posts can be difficult to deal with. Try not to repost or argue publicly. If safe, keep a record of the content and ask a trusted adult to help you decide what to do next.",choices:[["Help me talk to an adult","tellAdult"],["How can I report a post?","blockHelp"],["Someone shared a screenshot","screenshot"],["I need a little encouragement","comfort"],["More options","greeting"]]},
    excluded:{text:"Being deliberately left out can hurt. You deserve friendships where you feel respected. Consider talking privately with someone you trust and explaining how the situation is affecting you.",choices:[["What could I say?","tellAdult"],["I want to support a friend too","friend"],["I need encouragement","comfort"],["Back to options","greeting"]]},
    threats:{text:"Your safety comes first. Please do not respond to threats or meet anyone who is making you feel unsafe. Tell a trusted adult as soon as possible and ask them to help you contact the platform. If there is immediate danger, get help from an adult and local emergency services.",choices:[["How do I tell a trusted adult?","tellAdult"],["I want to review safety steps","blockHelp"],["Back to options","greeting"]]},
    other:{text:"Thank you for telling me. You do not need to share names or private details here. A trusted adult can help you think through what happened and what support is available.",choices:[["Help me start that conversation","tellAdult"],["Explore safety steps","blockHelp"],["Other topics","greeting"]]},
    friend:{text:"It is thoughtful that you want to help. Listen without judging, let your friend know they are not alone, and avoid forwarding or reacting to hurtful content. You can encourage them to speak with a trusted adult.",choices:[["What if my friend asks me to keep it secret?","secret"],["What can I say to them?","friendWords"],["How can I report harmful content?","blockHelp"],["More topics","greeting"]]},
    secret:{text:"You can respect your friend's feelings while explaining that safety matters more than keeping a secret. If they may be in danger or the situation is serious, involve a trusted adult who can help.",choices:[["Help me find the words","friendWords"],["Back to options","greeting"]]},
    friendWords:{text:"You could say: “I'm glad you told me. You don't deserve this, and I'm here to listen. Would you like me to help you talk to an adult you trust?”",choices:[["That helps, thank you","comfort"],["What if they say no?","friendNo"],["More options","greeting"]]},
    friendNo:{text:"Keep listening and avoid pressuring them. You can remind them that support is available. If you believe someone is at risk of harm, tell a trusted adult even if it feels difficult.",choices:[["I understand","comfort"],["Back to options","greeting"]]},
    learn:{text:"Cyberbullying is bullying that happens through digital spaces. It can include repeated hurtful messages, humiliating posts, rumors, impersonation or deliberate exclusion. What would you like to explore?",choices:[["How to recognize it","signs"],["How to prevent it","prevention"],["How to be a supportive bystander","bystander"],["Back to options","greeting"]]},
    signs:{text:"Look for patterns such as repeated unwanted messages, public humiliation, threats, fake accounts or sharing someone's content to embarrass them. A single online disagreement is not automatically cyberbullying, but hurtful behavior still deserves attention.",choices:[["How can I respond safely?","blockHelp"],["How can I support someone?","friend"],["Back to options","greeting"]]},
    prevention:{text:"Helpful habits include using privacy settings, choosing strong unique passwords, thinking before posting, asking permission before sharing images and treating others respectfully. You can also pause and report content that breaks platform rules.",choices:[["Show me blocking and reporting steps","blockHelp"],["How can I protect my privacy?","privacy"],["How can I help a friend?","friend"],["Back to options","greeting"]]},
    bystander:{text:"You can help by not liking, sharing or adding to harmful posts; checking in privately with the person; and asking a trusted adult for guidance. Do not put yourself in danger or start a public argument.",choices:[["What can I say to them?","friendWords"],["Back to options","greeting"]]},
    blockHelp:{text:"Here are general steps (menus differ by platform): open the account or content options, look for Block or Report, choose the most accurate reason and follow the prompts. You can also review who may message, tag or view your posts. A trusted adult can help you find the current settings.",choices:[["I want emotional support","comfort"],["Help me talk to an adult","tellAdult"],["What else can I do?","messages"],["Back to options","greeting"]]},
    tellAdult:{text:"Starting can feel awkward. You could say: “Something online has been happening and it's bothering me. I don't need you to fix everything right away, but I would really like you to listen and help me work out what to do.” You can choose a parent, caregiver, teacher, school counselor or another adult you trust.",choices:[["What if I'm nervous?","nervous"],["I can try that","comfort"],["Back to options","greeting"]]},
    nervous:{text:"That makes sense. You could write down a few points first, send a simple message asking to talk, or ask someone you trust to sit with you. You deserve to be heard, and asking for help is a positive step.",choices:[["Thank you","comfort"],["More options","greeting"]]},
    comfort:{text:"A reminder for you: what someone chooses to post does not decide your worth. You deserve respect, kindness and support. If you can, take a break from the screen and connect with someone who makes you feel safe.",choices:[["Give me another reminder","anotherComfort"],["I want to talk about what's happening","greeting"],["Explore practical steps","blockHelp"],["I'm done for now","end"]]},
    anotherComfort:{text:"You do not have to solve everything today. One small, safe step is still progress. You matter beyond notifications, comments and likes.",choices:[["More encouragement","comfort"],["Practical options","greeting"],["I'm done for now","end"]]},
    unsure:{text:"That's okay. You can start with a topic, or simply explore at your own pace. You do not need to tell me personal details.",choices:[["Learn what cyberbullying is","learn"],["Explore ways to stay safer","blockHelp"],["Read a kind reminder","comfort"],["Talk about a friend","friend"]]},
    topics:{text:"I can guide you through pre-written information about online bullying, privacy and reporting, supporting a friend, or finding words to ask a trusted adult for help. What would you like to explore?",choices:[["Cyberbullying is happening to me","targeted"],["I'm worried about a friend","friend"],["Learn & prevent","learn"],["Encouragement","comfort"]]},
    privacy:{text:"Protecting your privacy gives you more control over your online space. Review who can see your posts, message you, tag you and view your stories. Use a strong, unique password and never share login codes. Which topic should we explore?",choices:[["Who can see my posts?","privacyPosts"],["How do I make my account safer?","accountSafety"],["Someone is pretending to be me","impersonation"],["Back to options","greeting"]]},
    privacyPosts:{text:"You can check your account's privacy menu and choose an audience you recognize and trust. Review followers or friends from time to time, and avoid posting your school, address, live location or daily routine publicly.",choices:[["What about location sharing?","locationPrivacy"],["How can I protect my account?","accountSafety"],["More privacy tips","privacy"]]},
    locationPrivacy:{text:"It is safer to turn off public location sharing and avoid posting where you are in real time. Check photo permissions and ask a trusted adult if you are unsure which settings to use.",choices:[["Show me account safety tips","accountSafety"],["Back to privacy topics","privacy"]]},
    accountSafety:{text:"Use a long, unique password, turn on two-step verification when available, keep apps updated and never share verification codes. If you think someone accessed your account, ask a trusted adult to help you secure it through the platform's official recovery process.",choices:[["Someone may have my password","accountAccess"],["I want to learn about reporting","blockHelp"],["Back to privacy topics","privacy"]]},
    accountAccess:{text:"If you think someone knows your password, do not confront them online. With a trusted adult, use the platform's official account-recovery and security settings, change the password to a unique one and review active sessions.",choices:[["What if someone made a fake account?","impersonation"],["How do I ask an adult for help?","tellAdult"],["Back to options","greeting"]]},
    impersonation:{text:"A fake account using your name or photos can feel worrying. Do not argue with the account. Save the profile link or relevant details if safe, report it through the platform's impersonation option and ask a trusted adult to help.",choices:[["How do I report it?","blockHelp"],["How can I tell an adult?","tellAdult"],["I need reassurance","comfort"]]},
    screenshot:{text:"Before sharing a screenshot, pause and think about privacy. It may contain names, photos or personal details. Do not forward hurtful content. If you need to keep evidence, ask a trusted adult how to store it safely and privately.",choices:[["What if it is being shared around?","rumors"],["How can I report it?","blockHelp"],["I feel overwhelmed","overwhelmed"]]},
    overwhelmed:{text:"It can be a lot to deal with at once. You do not need to figure everything out immediately. Consider stepping away from the screen, taking a few calm breaths and contacting someone you trust. What would feel most helpful next?",choices:[["Help me explain it to an adult","tellAdult"],["I want a kind reminder","comfort"],["Give me practical steps","blockHelp"],["Back to options","greeting"]]},
    anger:{text:"Feeling angry after being treated unfairly is understandable. Try not to post or reply while emotions are high. A pause can help you choose a response that keeps you safe and does not escalate the situation.",choices:[["What can I do instead?","blockHelp"],["I want to talk to an adult","tellAdult"],["I need encouragement","comfort"]]},
    adultNoListen:{text:"I'm sorry you felt unheard. You could try another trusted adult, such as a teacher, school counselor, relative or caregiver. Be clear that you need them to listen and help you make a safe plan. If the first person cannot help, it is okay to ask someone else.",choices:[["Help me find the words","tellAdult"],["I feel overwhelmed","overwhelmed"],["Back to options","greeting"]]},
    schoolSupport:{text:"If this is connected to school, you could speak privately with a teacher, tutor, counselor or school leader you trust. Share only the details needed to explain what is happening and ask what support is available.",choices:[["I'm nervous to speak up","nervous"],["Help me explain what happened","tellAdult"],["Back to options","greeting"]]},
    end:{text:"Thanks for spending a little time here. Remember: SafeSpace is a guide, not a real person or emergency service. You can return whenever you want, and a trusted adult can help with real-life situations.",choices:[["Start again","greeting"],["Finish for now","end"]]}
  };
  let assistantName=localStorage.getItem(STORAGE_NAME)||"",chatStarted=false,currentNode="start";
  function updateAssistantName(){const n=assistantName||"SafeSpace Assistant";$("#assistantDisplayName").textContent=n;$("#nameModalTitle").textContent="What would you like to call your assistant?";}
  function appendMessage(text,who){const el=document.createElement("div");el.className="message "+who;el.textContent=text;$("#chatMessages").appendChild(el);$("#chatMessages").scrollTop=$("#chatMessages").scrollHeight;}
  function renderNode(key){const node=chatNodes[key]||chatNodes.greeting;currentNode=key;appendMessage(node.text,"bot");$("#chatChoices").innerHTML=node.choices.map(([label,target])=>`<button class="choice-btn" data-chat-target="${target}">${escapeHTML(label)}</button>`).join("");}
  function setAssistantName(name){assistantName=name.trim().slice(0,24);try{localStorage.setItem(STORAGE_NAME,assistantName);}catch{}updateAssistantName();$("#nameModalBackdrop").classList.add("hidden");if(!chatStarted){$("#chatMessages").innerHTML="";appendMessage(`Hi! I'm ${assistantName}. I'm your SafeSpace guide. I use prepared responses to help you explore online safety and support options. What would you like help with today?`,"bot");$("#chatChoices").innerHTML=chatNodes.greeting.choices.map(([label,target])=>`<button class="choice-btn" data-chat-target="${target}">${escapeHTML(label)}</button>`).join("");chatStarted=true;currentNode="greeting";}}
  function openAssistant(){if(chatStarted)return;updateAssistantName();if(!assistantName){$("#nameModalBackdrop").classList.remove("hidden");}else{setAssistantName(assistantName);}}
  $("#nameForm").addEventListener("submit",e=>{e.preventDefault();const val=$("#assistantNameInput").value.trim();if(!val){showToast("Please enter a name or choose the default.");return;}setAssistantName(val);});
  $("#skipName").addEventListener("click",()=>setAssistantName("SafeSpace Assistant"));
  $("#chatChoices").addEventListener("click",e=>{const b=e.target.closest("[data-chat-target]");if(!b)return;const target=b.dataset.chatTarget;appendMessage(b.textContent,"user");if(target==="name"){$("#nameModalBackdrop").classList.remove("hidden");return;}if(target==="defaultName"){setAssistantName("SafeSpace Assistant");return;}if(target==="end"&&currentNode==="end"){appendMessage("You can close this page whenever you're ready.","bot");$("#chatChoices").innerHTML="";return;}renderNode(target);});
  $("#chatForm").addEventListener("submit",e=>{e.preventDefault();const val=$("#chatInput").value.trim();if(!val)return;appendMessage(val,"user");$("#chatInput").value="";const low=val.toLowerCase();let target="unsure";if(/friend|classmate|someone else/.test(low))target="friend";else if(/threat|unsafe|scared|danger/.test(low))target="threats";else if(/fake account|pretend|impersonat/.test(low))target="impersonation";else if(/password|hack|account/.test(low))target="accountSafety";else if(/privacy|private|location|followers/.test(low))target="privacy";else if(/screenshot|forward|share/.test(low))target="screenshot";else if(/angry|mad|revenge/.test(low))target="anger";else if(/overwhelm|anxious|stress|nervous/.test(low))target="overwhelmed";else if(/message|comment|insult|mean/.test(low))target="messages";else if(/rumor|photo|post|embarrass/.test(low))target="rumors";else if(/block|report/.test(low))target="blockHelp";else if(/adult|teacher|parent|tell/.test(low))target="tellAdult";else if(/sad|upset|support|encourage|feel/.test(low))target="comfort";else if(/learn|what is|cyberbullying/.test(low))target="learn";appendMessage("Thanks for sharing. I can respond to a few common topics, but I may not understand everything you type. Here is a helpful place to start:","bot");renderNode(target);});
  function resetChat(){chatStarted=false;$("#chatMessages").innerHTML="";$("#chatChoices").innerHTML="";if(assistantName){setAssistantName(assistantName);}else{$("#nameModalBackdrop").classList.remove("hidden");}}
  $("#resetChat").addEventListener("click",resetChat);$("#sideReset").addEventListener("click",resetChat);
  $("#nameModalBackdrop").addEventListener("click",e=>{if(e.target===$("#nameModalBackdrop")){/* keep naming step open */}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();$("#sidebar").classList.remove("open");}});

  updateReportCount();renderReports();
})();
