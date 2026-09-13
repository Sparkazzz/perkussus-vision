import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://rfppqbxcqkeukaydcpar.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_UD_IZ1eyihvLsNR9kSOovA_FbNtPz13';
const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.PV_SUPABASE=supabase;

const copy={
 it:{account:'Account',signIn:'Accedi',signUp:'Crea account',email:'Email',password:'Password',name:'Nome',continue:'CONTINUA',logout:'ESCI',profile:'Profilo Perkussus',level:'Livello',points:'Reality Points',secure:'Account protetto da Supabase Auth',needConfirm:'Controlla la tua email per confermare l’account.',welcome:'Accesso effettuato.',created:'Account creato.',error:'Operazione non riuscita.',close:'Chiudi',switchIn:'Hai già un account? Accedi',switchUp:'Non hai un account? Registrati',passwordHint:'Almeno 8 caratteri',signedAs:'Connesso come'},
 en:{account:'Account',signIn:'Sign in',signUp:'Create account',email:'Email',password:'Password',name:'Name',continue:'CONTINUE',logout:'SIGN OUT',profile:'Perkussus profile',level:'Level',points:'Reality Points',secure:'Account protected by Supabase Auth',needConfirm:'Check your email to confirm your account.',welcome:'Signed in.',created:'Account created.',error:'Operation failed.',close:'Close',switchIn:'Already have an account? Sign in',switchUp:'No account yet? Sign up',passwordHint:'At least 8 characters',signedAs:'Signed in as'},
 fr:{account:'Compte',signIn:'Se connecter',signUp:'Créer un compte',email:'E-mail',password:'Mot de passe',name:'Nom',continue:'CONTINUER',logout:'SE DÉCONNECTER',profile:'Profil Perkussus',level:'Niveau',points:'Reality Points',secure:'Compte protégé par Supabase Auth',needConfirm:'Consultez votre e-mail pour confirmer le compte.',welcome:'Connexion réussie.',created:'Compte créé.',error:'Opération impossible.',close:'Fermer',switchIn:'Vous avez déjà un compte ? Connectez-vous',switchUp:'Pas encore de compte ? Inscrivez-vous',passwordHint:'Au moins 8 caractères',signedAs:'Connecté en tant que'},
 es:{account:'Cuenta',signIn:'Iniciar sesión',signUp:'Crear cuenta',email:'Correo electrónico',password:'Contraseña',name:'Nombre',continue:'CONTINUAR',logout:'CERRAR SESIÓN',profile:'Perfil Perkussus',level:'Nivel',points:'Reality Points',secure:'Cuenta protegida por Supabase Auth',needConfirm:'Revisa tu correo para confirmar la cuenta.',welcome:'Sesión iniciada.',created:'Cuenta creada.',error:'No se pudo completar la operación.',close:'Cerrar',switchIn:'¿Ya tienes cuenta? Inicia sesión',switchUp:'¿No tienes cuenta? Regístrate',passwordHint:'Al menos 8 caracteres',signedAs:'Conectado como'},
 de:{account:'Konto',signIn:'Anmelden',signUp:'Konto erstellen',email:'E-Mail',password:'Passwort',name:'Name',continue:'WEITER',logout:'ABMELDEN',profile:'Perkussus-Profil',level:'Level',points:'Reality Points',secure:'Konto durch Supabase Auth geschützt',needConfirm:'Bestätige dein Konto über die E-Mail.',welcome:'Angemeldet.',created:'Konto erstellt.',error:'Vorgang fehlgeschlagen.',close:'Schließen',switchIn:'Schon registriert? Anmelden',switchUp:'Noch kein Konto? Registrieren',passwordHint:'Mindestens 8 Zeichen',signedAs:'Angemeldet als'},
 ru:{account:'Аккаунт',signIn:'Войти',signUp:'Создать аккаунт',email:'Эл. почта',password:'Пароль',name:'Имя',continue:'ПРОДОЛЖИТЬ',logout:'ВЫЙТИ',profile:'Профиль Perkussus',level:'Уровень',points:'Reality Points',secure:'Аккаунт защищён Supabase Auth',needConfirm:'Проверьте почту и подтвердите аккаунт.',welcome:'Вход выполнен.',created:'Аккаунт создан.',error:'Не удалось выполнить операцию.',close:'Закрыть',switchIn:'Уже есть аккаунт? Войти',switchUp:'Нет аккаунта? Зарегистрироваться',passwordHint:'Не менее 8 символов',signedAs:'Выполнен вход как'},
 hi:{account:'खाता',signIn:'साइन इन',signUp:'खाता बनाएँ',email:'ईमेल',password:'पासवर्ड',name:'नाम',continue:'जारी रखें',logout:'साइन आउट',profile:'Perkussus प्रोफ़ाइल',level:'स्तर',points:'Reality Points',secure:'Supabase Auth द्वारा सुरक्षित खाता',needConfirm:'खाता पुष्टि करने के लिए ईमेल देखें।',welcome:'साइन इन सफल।',created:'खाता बनाया गया।',error:'कार्रवाई पूरी नहीं हुई।',close:'बंद करें',switchIn:'पहले से खाता है? साइन इन करें',switchUp:'खाता नहीं है? साइन अप करें',passwordHint:'कम से कम 8 अक्षर',signedAs:'साइन इन'},
 pt:{account:'Conta',signIn:'Entrar',signUp:'Criar conta',email:'E-mail',password:'Palavra-passe',name:'Nome',continue:'CONTINUAR',logout:'SAIR',profile:'Perfil Perkussus',level:'Nível',points:'Reality Points',secure:'Conta protegida pelo Supabase Auth',needConfirm:'Verifique o e-mail para confirmar a conta.',welcome:'Sessão iniciada.',created:'Conta criada.',error:'Não foi possível concluir a operação.',close:'Fechar',switchIn:'Já tem conta? Entre',switchUp:'Ainda não tem conta? Registe-se',passwordHint:'Pelo menos 8 caracteres',signedAs:'Ligado como'},
 zh:{account:'账户',signIn:'登录',signUp:'创建账户',email:'电子邮箱',password:'密码',name:'姓名',continue:'继续',logout:'退出登录',profile:'Perkussus 个人资料',level:'等级',points:'Reality Points',secure:'账户由 Supabase Auth 保护',needConfirm:'请检查邮箱并确认账户。',welcome:'登录成功。',created:'账户已创建。',error:'操作失败。',close:'关闭',switchIn:'已有账户？登录',switchUp:'还没有账户？注册',passwordHint:'至少 8 个字符',signedAs:'已登录为'},
 ja:{account:'アカウント',signIn:'ログイン',signUp:'アカウント作成',email:'メール',password:'パスワード',name:'名前',continue:'続ける',logout:'ログアウト',profile:'Perkussus プロフィール',level:'レベル',points:'Reality Points',secure:'Supabase Auth で保護されたアカウント',needConfirm:'メールを確認してアカウントを認証してください。',welcome:'ログインしました。',created:'アカウントを作成しました。',error:'操作に失敗しました。',close:'閉じる',switchIn:'アカウントをお持ちですか？ログイン',switchUp:'アカウントがありませんか？登録',passwordHint:'8文字以上',signedAs:'ログイン中'}
};

const lang=()=>{try{return localStorage.getItem('pv_language')||'it'}catch{return 'it'}};
const t=k=>(copy[lang()]||copy.it)[k]||copy.en[k]||k;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

const style=document.createElement('style');
style.textContent=`
#pvAuthScrim{position:fixed;inset:0;background:rgba(0,0,0,.62);backdrop-filter:blur(4px);z-index:2998;opacity:0;pointer-events:none;transition:.2s}
#pvAuthScrim.open{opacity:1;pointer-events:auto}
#pvAuthSheet{position:fixed;left:0;right:0;bottom:0;z-index:2999;background:#0d1220;border:1px solid rgba(255,255,255,.12);border-radius:28px 28px 0 0;box-shadow:0 -24px 70px rgba(0,0,0,.5);transform:translateY(105%);transition:transform .25s ease;max-height:min(86vh,760px);overflow:auto;padding:0 0 calc(22px + env(safe-area-inset-bottom))}
#pvAuthSheet.open{transform:translateY(0)}
.pv-auth-head{display:flex;justify-content:space-between;align-items:flex-start;padding:22px 22px 14px;border-bottom:1px solid rgba(255,255,255,.08)}
.pv-auth-head small{display:block;font-size:11px;letter-spacing:.16em;color:#72e8ff;margin-bottom:6px}.pv-auth-head h2{margin:0;color:#fff;font-size:24px}.pv-auth-close{width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:#151b29;color:#fff;font-size:28px}
.pv-auth-body{padding:20px 22px}.pv-auth-tabs{display:grid;grid-template-columns:1fr 1fr;background:#080c15;border:1px solid rgba(255,255,255,.09);border-radius:15px;padding:4px;margin-bottom:18px}.pv-auth-tabs button{border:0;background:transparent;color:#8d96aa;padding:12px;border-radius:11px;font-weight:800}.pv-auth-tabs button.active{background:#192132;color:#fff}
.pv-auth-field{display:grid;gap:7px;margin:13px 0}.pv-auth-field label{font-size:12px;color:#aab3c6;font-weight:700}.pv-auth-field input{width:100%;box-sizing:border-box;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:#080c15;color:#fff;padding:15px 14px;font-size:16px;outline:none}.pv-auth-field input:focus{border-color:#69dbf5}.pv-auth-hint{font-size:11px;color:#707a8f}.pv-auth-primary,.pv-auth-logout{width:100%;border:0;border-radius:15px;padding:15px;font-weight:900;letter-spacing:.05em;margin-top:8px}.pv-auth-primary{background:#eafaff;color:#061018}.pv-auth-logout{background:#25151a;color:#ffb4bd;border:1px solid rgba(255,115,130,.22)}.pv-auth-status{min-height:21px;margin:12px 2px 0;color:#aab3c6;font-size:13px;line-height:1.4}.pv-auth-status.error{color:#ff9faa}.pv-auth-profile{display:grid;gap:14px}.pv-auth-card{background:#080c15;border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:17px}.pv-auth-card small{display:block;color:#788297;font-size:11px;letter-spacing:.08em;margin-bottom:5px}.pv-auth-card b{color:#fff;font-size:18px}.pv-auth-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pv-auth-secure{font-size:12px;color:#82e9bd;margin-top:2px}.pv-account-row{order:-10}.pv-account-row .pv-user-dot{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;background:#122536;border:1px solid #4fcde8;color:#dffaff;font-size:12px;font-weight:900;margin-right:4px}
@media(min-width:760px){#pvAuthSheet{left:auto;width:430px;right:22px;bottom:22px;border-radius:28px;max-height:calc(100vh - 44px)}}`;
document.head.appendChild(style);

const scrim=document.createElement('div');scrim.id='pvAuthScrim';
const sheet=document.createElement('section');sheet.id='pvAuthSheet';sheet.setAttribute('aria-hidden','true');
sheet.innerHTML=`<header class="pv-auth-head"><div><small>PERKUSSUS ID</small><h2>${t('account')}</h2></div><button class="pv-auth-close" aria-label="${t('close')}">×</button></header><div class="pv-auth-body" id="pvAuthBody"></div>`;
document.body.append(scrim,sheet);

const menu=document.querySelector('#moreSheet .menu-list');
const accountRow=document.createElement('button');accountRow.className='menu-item pv-account-row';accountRow.type='button';accountRow.innerHTML=`<span class="pv-user-dot">PV</span><div><b>${t('account')}</b><small id="pvAccountSubtitle">${t('signIn')}</small></div>`;
menu?.prepend(accountRow);

let mode='signin',session=null,profile=null;
function close(){sheet.classList.remove('open');scrim.classList.remove('open');sheet.setAttribute('aria-hidden','true')}
function open(){document.querySelector('#moreSheet [data-close]')?.click();render();sheet.classList.add('open');scrim.classList.add('open');sheet.setAttribute('aria-hidden','false')}
scrim.addEventListener('click',close);sheet.querySelector('.pv-auth-close').addEventListener('click',close);accountRow.addEventListener('click',open);

function authForm(){
 const signup=mode==='signup';
 return `<div class="pv-auth-tabs"><button type="button" data-auth-mode="signin" class="${!signup?'active':''}">${t('signIn')}</button><button type="button" data-auth-mode="signup" class="${signup?'active':''}">${t('signUp')}</button></div>
 <form id="pvAuthForm">${signup?`<div class="pv-auth-field"><label>${t('name')}</label><input name="name" maxlength="80" autocomplete="name"></div>`:''}<div class="pv-auth-field"><label>${t('email')}</label><input name="email" type="email" autocomplete="email" required></div><div class="pv-auth-field"><label>${t('password')}</label><input name="password" type="password" autocomplete="${signup?'new-password':'current-password'}" minlength="8" required><span class="pv-auth-hint">${t('passwordHint')}</span></div><button class="pv-auth-primary" type="submit">${t('continue')}</button><div class="pv-auth-status" id="pvAuthStatus"></div></form>`;
}
function profileView(){
 const email=session?.user?.email||'';const display=profile?.display_name||session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||email.split('@')[0]||'Explorer';
 const initial=(display.trim()[0]||'P').toUpperCase();
 return `<div class="pv-auth-profile"><div class="pv-auth-card"><small>${t('profile')}</small><b>${esc(display)}</b><div class="pv-auth-secure">${t('secure')}</div></div><div class="pv-auth-grid"><div class="pv-auth-card"><small>${t('level')}</small><b>${Number(profile?.level||1)}</b></div><div class="pv-auth-card"><small>${t('points')}</small><b>${Number(profile?.reality_points||0).toLocaleString()}</b></div></div><div class="pv-auth-card"><small>${t('signedAs')}</small><b style="font-size:14px">${esc(email)}</b></div><button class="pv-auth-logout" id="pvLogout">${t('logout')}</button></div>`;
}
function render(){
 const body=document.querySelector('#pvAuthBody');if(!body)return;body.innerHTML=session?profileView():authForm();
 if(session){document.querySelector('#pvLogout')?.addEventListener('click',async()=>{await supabase.auth.signOut();close()});return}
 body.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.authMode;render()}));
 body.querySelector('#pvAuthForm')?.addEventListener('submit',submitAuth);
}
async function submitAuth(e){
 e.preventDefault();const form=e.currentTarget,status=form.querySelector('#pvAuthStatus');const data=new FormData(form);const email=String(data.get('email')||'').trim();const password=String(data.get('password')||'');const name=String(data.get('name')||'').trim();status.className='pv-auth-status';status.textContent='…';
 try{
   if(mode==='signup'){
     const {data:res,error}=await supabase.auth.signUp({email,password,options:{data:{full_name:name||undefined},emailRedirectTo:location.origin}});if(error)throw error;
     if(!res.session){status.textContent=t('needConfirm')}else{status.textContent=t('created')}
   }else{
     const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;status.textContent=t('welcome')
   }
 }catch(err){status.className='pv-auth-status error';status.textContent=err?.message||t('error')}
}
async function loadProfile(){
 profile=null;if(!session?.user?.id)return;
 const {data}=await supabase.from('profiles').select('display_name,avatar_url,preferred_language,level,reality_points').eq('id',session.user.id).maybeSingle();profile=data||null;
}
function syncMenu(){
 const sub=document.querySelector('#pvAccountSubtitle');const dot=accountRow.querySelector('.pv-user-dot');if(!sub||!dot)return;
 if(session){const label=profile?.display_name||session.user.user_metadata?.full_name||session.user.user_metadata?.name||session.user.email?.split('@')[0]||'Explorer';sub.textContent=label;dot.textContent=(label[0]||'P').toUpperCase()}else{sub.textContent=t('signIn');dot.textContent='PV'}
}
async function setSession(next){session=next;await loadProfile();syncMenu();if(sheet.classList.contains('open'))render()}
const {data:{session:initialSession}}=await supabase.auth.getSession();await setSession(initialSession);
supabase.auth.onAuthStateChange((_event,nextSession)=>{setTimeout(()=>setSession(nextSession),0)});
