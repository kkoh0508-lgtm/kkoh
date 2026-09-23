# 건오's calendar — 서버 저장 버전

기존 calendar.html 화면을 유지하면서, 일정과 직접 수정한 공휴일을 Neon PostgreSQL에 저장하도록 바꾼 개인용 달력입니다.

**먼저 할 일: ZIP 압축 해제 → GitHub에 소스 업로드 → Neon DB 생성 → Render에 배포.**

이 ZIP은 배포용 소스입니다. 아직 인터넷에 배포된 것은 아니며, `public/index.html`을 더블클릭해서 사용하는 방식이 아닙니다. 아래 과정을 마치면 Render에서 발급받은 HTTPS 주소로 사용합니다. PC를 꺼도 DB에 저장된 일정은 유지됩니다.

## 1. GitHub에 올리기

1. https://github.com 에 로그인합니다.
2. 새 저장소(New repository)를 만듭니다. 이름 예: `geonoh-calendar`. 개인용이라면 Private으로 만들어도 됩니다.
3. 저장소에서 `uploading an existing file` 또는 `Add file → Upload files`를 선택합니다.
4. 압축을 푼 `calendar-server` 폴더 **안의 파일과 폴더**를 업로드합니다. ZIP 자체를 업로드하지 마세요.
5. 저장소 첫 화면에 `package.json`, `server.js`, `render.yaml`, `public` 폴더가 바로 보이도록 올립니다. `calendar-server` 폴더 아래에 한 번 더 들어가 있으면 안 됩니다.
6. Commit changes로 저장합니다.

`.env.example`은 예시만 들어 있습니다. 실제 비밀번호와 DATABASE_URL을 소스나 GitHub에 적지 말고 Render 환경변수에 입력하세요. `.gitignore`는 Git 사용 시 실제 `.env` 업로드를 막습니다. 웹 업로드에서는 직접 확인하세요.

## 2. Neon 데이터베이스 만들기

1. https://console.neon.tech 에 로그인하여 프로젝트를 만듭니다.
2. 프로젝트 이름은 자유롭게 정하고, 지역은 가능한 한 Render 서버와 가까운 곳을 선택합니다.
3. 프로젝트의 **Connect**에서 PostgreSQL 연결 문자열(Connection string)을 복사합니다. Connection pooling을 켠 주소를 사용해도 됩니다.
4. `postgresql://...`로 시작하는 **주소만** 복사합니다. `psql` 명령이나 양쪽 따옴표는 포함하지 않습니다.
5. 이 주소는 뒤에서 Render의 `DATABASE_URL`에 입력합니다. Neon이 제공하는 SSL 옵션을 유지하세요. 인증서 검증을 명시하려면 `sslmode=require`를 `sslmode=verify-full`로 바꿀 수 있습니다.

테이블은 서버가 처음 시작할 때 자동 생성됩니다. 별도 SQL 입력은 필요 없습니다. 전용 새 데이터베이스 사용을 권장합니다. 기본 테이블 이름은 `calendar_state`이며, 개인 달력 한 개를 저장합니다.

## 3. Render에 배포하기 — 권장: Blueprint

1. https://dashboard.render.com 에 로그인합니다.
2. `New + → Blueprint`를 선택합니다.
3. GitHub를 연결하고 방금 만든 저장소를 선택합니다. Private 저장소라면 Render에 그 저장소 접근을 허용합니다.
4. 저장소의 `render.yaml`을 읽어 Web Service 설정이 나타납니다.
5. 다음 값을 입력합니다.

| 환경변수 | 넣을 값 |
| --- | --- |
| `DATABASE_URL` | Neon에서 복사한 PostgreSQL 연결 문자열 |
| `APP_PASSWORD` | 달력 로그인에 쓸 **16자 이상**의 비밀번호 |
| `SESSION_SECRET` | Blueprint가 자동 생성하므로 직접 만들 필요 없음 |

6. 표시되는 요금제와 설정을 확인한 뒤 배포를 시작합니다. 설정 파일은 Free 요금제로 되어 있습니다.
7. 서비스 상태가 Live가 되면 `https://서비스이름.onrender.com` 주소를 엽니다.
8. `APP_PASSWORD`에 설정한 비밀번호로 로그인합니다.
9. 일정 하나를 등록한 뒤 `서버 저장 완료`를 확인하고 새로고침합니다. 같은 일정이 보이면 연결 확인이 끝납니다. 다른 기기에서도 같은 주소와 비밀번호를 사용합니다.

서버 주소는 Render의 `RENDER_EXTERNAL_URL`에서 자동 인식합니다. 사용자 지정 도메인을 연결한다면 Render 환경변수에 `APP_ORIGIN=https://내도메인`을 추가하고 재배포하세요. 앱은 이 주소에서의 저장 요청만 허용합니다. 도메인은 하나를 정해서 사용하세요.

### Blueprint가 보이지 않는 경우: Web Service 수동 생성

`New + → Web Service`에서 GitHub 저장소를 선택하고 아래처럼 설정합니다.

| 항목 | 값 |
| --- | --- |
| Language / Runtime | Node |
| Root Directory | 비워 둠 |
| Build Command | `npm install --omit=dev` |
| Start Command | `npm start` |
| Health Check Path | `/healthz` |
| Instance Type | Free 또는 직접 선택한 요금제 |

환경변수 `DATABASE_URL`, `APP_PASSWORD`, `NODE_ENV=production`, `SESSION_SECRET`을 추가합니다. 수동 배포에서는 `SESSION_SECRET`을 직접 생성해야 합니다. Render에 Generate 기능이 있으면 사용하고, 없으면 로컬 Node.js에서 다음 명령으로 생성할 수 있습니다.

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

생성한 값은 Render 환경변수에만 입력하세요. 앱은 Node.js 22를 사용하도록 지정되어 있습니다.

## 4. 컴퓨터 시작 시 자동으로 열기 — Windows

이 설정은 **Windows 로그인 후 브라우저에서 달력 주소를 여는 것**입니다. 서버 자체는 Render에서 실행됩니다. PC를 켜 두거나 Node.js를 PC에서 실행할 필요는 없습니다.

### 클릭으로 설정하는 방법

1. 배포된 달력의 HTTPS 주소를 복사합니다.
2. 키보드에서 `Win + R`을 누릅니다.
3. `shell:startup`을 입력하고 Enter를 누릅니다.
4. 열린 시작프로그램 폴더의 빈 곳에서 우클릭 → `새로 만들기 → 바로 가기`를 선택합니다.
5. 항목 위치에 달력 주소를 붙여 넣습니다. 예: `https://내서비스.onrender.com`
6. 이름을 `건오 달력`으로 정하고 완료합니다.
7. 다음 Windows 로그인부터 기본 브라우저에서 자동으로 열립니다. 해제하려면 이 바로 가기만 삭제하면 됩니다.

로그인은 같은 브라우저에서 최대 30일 유지됩니다. 로그아웃하거나 쿠키를 지우거나 세션이 만료되면 다시 로그인합니다.

### 포함된 스크립트로 설정하는 방법

압축을 푼 폴더에서 PowerShell을 열고 실행합니다. 주소를 본인의 실제 배포 주소로 바꾸세요.

```powershell
.\enable-startup.ps1 -Url "https://내서비스.onrender.com"
```

해제:

```powershell
.\disable-startup.ps1
```

스크립트 실행이 차단되어 있으면 위의 클릭 방식으로 설정하면 됩니다. 시스템 실행 정책을 바꿀 필요는 없습니다. 자동 실행 설정은 이 ZIP을 받는 것만으로 적용되지 않습니다.

## 5. 기존 일정 옮기기

기존 HTML에 등록한 일정은 **HTML 파일 안이 아니라 그 파일을 열었던 브라우저 저장소**에 있습니다. 따라서 소스 파일만 옮겨서는 일정이 복사되지 않습니다.

1. 기존에 사용하던 브라우저에서 **원래 경로의 calendar.html**을 엽니다.
2. F12를 눌러 개발자 도구의 Console을 엽니다.
3. 다음 코드를 확인한 뒤 실행합니다. 기존 저장소를 읽어서 JSON 파일로 내려받을 뿐, 기존 데이터를 변경하거나 외부로 전송하지 않습니다.

```javascript
(() => {
  const data = {
    events: JSON.parse(localStorage.getItem('haru.events.v1') || '[]'),
    holidayOverrides: JSON.parse(localStorage.getItem('haru.holidayOverrides.v1') || '{}')
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], {type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'calendar-old-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
})();
```

4. 새 서버 앱에 로그인하고 `백업 가져오기`에서 받은 JSON을 선택합니다.
5. 교체 확인 후 저장합니다. **가져오기는 병합이 아니라 전체 교체**입니다. 서버에 일정이 있으면 먼저 `백업 다운로드`로 보관하세요.

기존 일정이 없다면 이 단계는 건너뜁니다. 새 앱에서도 언제든 JSON 백업 다운로드/복원을 할 수 있습니다.

## 6. 사용 중 알아둘 점

- 일정과 공휴일 수동 수정은 Neon에 저장합니다. 자동 공휴일 자료만 브라우저에 캐시합니다.
- 인터넷이 끊기면 새 변경을 서버에 저장할 수 없습니다. 실패한 변경을 저장했다고 표시하지 않습니다. 자동 재전송이나 오프라인 편집 큐는 없습니다.
- 다른 창에서 동시에 저장하면 뒤의 저장은 충돌 안내를 표시합니다. 입력한 내용을 따로 복사해 두고 창을 닫은 뒤 `서버에서 새로고침`을 누르고 다시 수정하세요.
- 편집창이 닫혀 있고 탭이 활성 상태이면 약 30초마다 서버의 최신 내용을 확인합니다.
- 개인 달력 한 개와 공통 비밀번호 한 개를 사용하는 앱입니다. 회원가입이나 사용자별 달력 기능은 없습니다.
- 로그인 20회 실패 시 해당 서버에서 최대 15분간 로그인이 제한됩니다. 단일 서버 인스턴스용 기본 보호입니다.
- 비밀번호를 바꾸고 기존 로그인도 모두 만료시키려면 Render의 `APP_PASSWORD`와 `SESSION_SECRET`을 함께 변경하고 재배포합니다.
- Render 무료 Web Service는 요청이 15분 없으면 중지될 수 있고, 다시 열 때 기동 시간이 걸립니다. 일정은 Neon에 남습니다. 무료 조건과 사용량 제한은 각 서비스 대시보드에서 확인하세요.
- 시작 직후 연결 오류가 나면 잠시 기다렸다가 다시 로그인/새로고침하세요. 계속 실패하면 Render Logs와 DATABASE_URL을 확인합니다.
- `/healthz`는 DB 연결도 검사합니다. 배포 시 health check 실패는 Neon 주소·비밀번호·네트워크 설정을 먼저 확인하세요.

## 7. 로컬 개발과 검증

Node.js 22와 Neon 연결 문자열이 있는 개발자용 절차입니다.

```powershell
npm install
Copy-Item .env.example .env
# .env에 실제 DATABASE_URL, APP_PASSWORD, SESSION_SECRET 입력
node --env-file=.env server.js
```

브라우저에서 `http://localhost:3000`을 엽니다. `.env`의 APP_ORIGIN과 실제 접속 주소가 같아야 합니다.

```powershell
npm test
```

제작 시 확인한 범위: Node 구문 검사, 메모리 저장소를 주입한 HTTP 통합 검사(로그인·비인증 차단·저장·삭제·동시 수정 충돌·형식 검증·Origin 검사·로그아웃·로그인 제한), 로컬 브라우저 로그인·일정 등록·새로고침 후 유지·공휴일 수정 저장.

실제 Neon/PostgreSQL과 Render 계정에는 연결하지 않았습니다. 제공된 운영 서버는 메모리 저장소가 아닌 PostgreSQL을 사용합니다. 배포 후 위 3번의 저장 확인을 완료하세요. 테스트용 서버와 비밀번호는 배포 ZIP에 포함하지 않았습니다.

## 참고 문서

- Render Node 배포: https://render.com/docs/deploy-node-express-app
- Render Blueprint: https://render.com/docs/blueprint-spec
- Render 무료 요금제: https://render.com/docs/free
- Neon 연결: https://neon.com/docs/connect/connect-from-any-app
- Windows 시작프로그램: https://support.microsoft.com/en-us/windows/experience/startup-boot/configure-startup-applications-in-windows
