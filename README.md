# Kiki Control Group Web

简单的参与者任务网站框架:输入 ID → 点击"静观饮食 / 身体扫描 / 静观呼吸"三个类别按钮之一,从该类别里随机播放一条音频(带进度条、可暂停/继续,不可拖动)→ 记录行为数据(用户 ID、事件类型、类别、实际播放的具体音频、播放时长、音频总时长)。

## 目前的状态

- 前端是纯静态 HTML/CSS/JS,没有任何构建步骤。
- 数据记录会同时写两份:浏览器本地 `localStorage`(纯粹是离线时的静默备份,**没有任何 UI 显示**)、以及云端 **Firebase Firestore**(项目 `kiki-control-group`,数据库节点选在 **香港(asia-east2)**)。
- 参与者页面上**看不到任何记录数据**——之前调试用的"記錄資料"面板已经拿掉了。只有输入管理员 ID 才会看到管理面板,而且还要用授权的 Google 账号登入才能真正读到数据,详见下面"管理面板"一节。
- 三个类别(内部代号 A/B/C)现在各接了一批真实的静观练习音频,来自港理工团队自己整理的正式清单(对照 `fabric bot audio list.docx`):A=静观饮食(6 条)、B=身体扫描(8 条)、C=静观呼吸(10 条)。点击类别按钮会从对应的一批里随机抽一条播放。原始文件名(通常包含来源、时长、机构等信息)保留在 `js/app.js` 每条记录的 `label` 字段里;实际部署用的文件名统一改成了 `A2.mp3`、`A3.mp3`...这种形式,避免中文/空格/特殊符号在网址里可能出问题(编号从 2 开始,是因为最早占位用的 `A1`/`B1`/`C1` 那一批音频已经确认跟正式清单重复/不在清单内,拿掉了)。后续往对应的 `audio/A/`、`audio/B/`、`audio/C/` 文件夹里加文件、再在配置里加一行即可继续扩充。

## 本地预览

直接双击 `index.html` 大概率也能跑,但更稳妥的方式是起一个本地静态服务器(避免浏览器对 `file://` 协议的某些限制):

```bash
npx serve .
```

或者用 Python:

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 部署到 GitHub Pages

1. 在 GitHub 上新建一个仓库(比如 `kiki-control-group-web`)。
2. 把这个文件夹的内容 push 上去:
   ```bash
   git init
   git add .
   git commit -m "Initial control group web framework"
   git branch -M main
   git remote add origin https://github.com/<你的用户名>/<仓库名>.git
   git push -u origin main
   ```
3. 在仓库的 Settings → Pages 里,Source 选 `main` 分支 / `root` 目录,保存。
4. 几分钟后网站会在 `https://<你的用户名>.github.io/<仓库名>/` 上线。

## 替换真实音频 / 增减数量

任务页现在显示 "静观饮食 / 身体扫描 / 静观呼吸" 三个按钮,点击后从对应类别里**随机**抽一条播放——参与者看不到具体是哪一条,但日志里的 `audioId` 会记录实际播放的是哪条,方便后续分析。

编辑 [`js/app.js`](js/app.js) 顶部的 `AUDIO_CATEGORIES` 数组。三个类别(内部代号仍是 A/B/C,决定按钮显示文字的是 `label`)各自的 `items` 是一个数组,想放几条音频就写几条:

```js
const AUDIO_CATEGORIES = [
  {
    id: "A",
    label: "静观饮食",
    items: [
      { id: "A1", label: "静观饮食", src: "audio/A/A1.mp3" },
      // 想给这一类再加音频,复制上面这行,改成 A2、A3...(id 不要跟已有的重复)
    ],
  },
  // B(身体扫描)、C(静观呼吸)结构相同,音频放进对应的 audio/B/、audio/C/ 文件夹
];
```

- `id`:必须在整个配置里全局唯一(建议延续 `A1`/`A2`/`B1`... 的命名),会被记录为日志里的 `audioId`。类别本身的 `id`(A/B/C)会被记录为 `category`,如果想让导出的数据里类别名称也直接可读(比如把 "A" 改成 "eating"),把这三个类别的 `id` 一起改掉即可,不影响其他逻辑。
- `label`:按钮上显示的文字。
- `src`:音频文件路径,真实文件放进对应的 `audio/A/`、`audio/B/`、`audio/C/` 文件夹里。

## 后端数据库(Firebase,已接入)

已经接好了,不用再配置。记录逻辑全部收拢在 `js/app.js` 的 `logEvent()` 函数里——每条事件先写 `localStorage`,再(best-effort、不阻塞、不影响本地记录)写一份到 Firestore 的 `events` 集合。Firebase 初始化和 config 在 `index.html` 的 `<script type="module">` 块里。

**安全规则**(在 Firebase 控制台 → Firestore → Rules 里设置的):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /events/{eventId} {
      allow create: if true;
      allow read: if request.auth != null && request.auth.token.email == 'brucelou46@gmail.com';
      allow update, delete: if false;
    }
  }
}
```
任何人都能新增一条记录(参与者不需要登录),但**读取只对指定的那一个 Google 账号开放**——因为 Firebase 的前端 config 本质是公开的(部署出去的静态代码谁都能看到),安全边界必须靠这份规则本身,不能靠"藏起来 key"或"前端判断用户名"这种表面功夫。规则里的邮箱要跟你在 Firebase Authentication 里实际登录用的 Google 账号完全一致,如果不是 `brucelou46@gmail.com`,告诉我,我再改。

**如果以后想换项目/换后端**:只需要改 `index.html` 里的 `firebaseConfig`(换 Firebase 项目),或者改 `js/app.js` 的 `logEvent()` 里 `window._fsAddDoc(...)` 那一行(换成 Supabase、Google Sheets Apps Script 或自己的服务器接口)——其他代码都不用动。

> 调试时注意:测试产生的记录(比如用 `TEST`、`localtest` 之类的 ID)也会真的写进 Firestore,正式收集数据前记得在管理面板里确认一下、必要时去 Firebase 控制台清掉测试数据。

## 管理面板(查看所有参与者的数据)

在 ID 输入框里输入 `admin`(这个字符串本身不是密码,只是用来打开管理面板入口——真正的门禁是下面这步的 Google 登录),会进入一个管理页面,点"使用 Google 帳號登入"、用授权账号登录后,会从 Firestore 读出**所有参与者的全部记录**,按日期分组、每个日期下再按参与者分组显示,并且可以匯出全部资料的 JSON/CSV。

**这一步需要你在 Firebase 控制台做两件事(我没法代替你操作):**

1. 打开 [Firebase 控制台 → Authentication](https://console.firebase.google.com/project/kiki-control-group/authentication/providers) → 如果是第一次用,先点 "Get started"。在 "Sign-in method" 标签页里,点 **Google**,打开启用开关,填一下 "Project support email"(选你自己的邮箱就行),保存。
2. 打开 [Firebase 控制台 → Firestore → Rules](https://console.firebase.google.com/project/kiki-control-group/firestore/rules),把内容整个替换成上面"安全规则"那一段(邮箱要改成你自己实际登录用的那个 Google 账号),点 **发布(Publish)**。

做完这两步,去网站上用 `admin` 登录、点 Google 登录按钮,应该就能看到数据了。如果登录后显示"沒有查看資料的權限",说明你登录的 Google 账号跟规则里写的邮箱不一致——用规则里指定的那个账号登录,或者告诉我要改成哪个邮箱。

## 记录的数据结构

每条记录长这样:

```json
{
  "id": "1737...-abc123",
  "userId": "P001",
  "timestamp": "2026-08-20T04:12:33.000Z",
  "eventType": "play_end",
  "category": "A",
  "audioId": "A2",
  "duration": 183.4,
  "totalDuration": 621.13
}
```

(这个例子里 `category: "A"` 对应"静观饮食",`audioId: "A2"` 是这一类里随机抽中的其中一条,`totalDuration` 621.13 秒 ≈ 10 分 21 秒,正是这条音频的真实长度。)

`eventType` 有六种:
- `session_start`:参与者输入 ID 进入任务页
- `click`:点击了 A/B/C 某个类别按钮(不管是开始播放还是中途停止;开始播放时 `audioId` 是这次随机抽中的那条)
- `play_start`:音频实际开始播放(暂停后点"继续"恢复播放不会重复记这条,记的是 `pause`/`resume`)
- `pause`:点了"暂停"按钮,`duration` 是暂停时播放到了第几秒
- `resume`:点了"继续"按钮恢复播放,`duration` 是从第几秒继续播放的(和前一条 `pause` 的 `duration` 应该一致)
- `play_end`:这次播放结束(自然播完、被打断切换,或点了"停止"),`duration` 是这次实际听到了第几秒(如果中途暂停过,暂停的时间不计入)

`duration` 和 `totalDuration` 的区别:`duration` 在 `pause`/`resume`/`play_end` 里都是指音频当时播放到的位置(第几秒),`totalDuration` 是这条音频本身的完整长度——两者一起能看出参与者听完了整条音频的多大比例,也能看出中途在哪里暂停过、暂停了几次。

## 待细化 / 可能要一起决定的点

- 是否需要限制"必须听完才能点下一个",还是允许随时切换?现在是允许随时切换/打断。
- 任务有没有明确的结束条件(比如每类音频都听过一遍后跳转到"完成"页)?现在还没有结束页。
- 是否需要参与者分组(比如真的按"对照组"随机分配 A/B/C 里放哪些音频)?
