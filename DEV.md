# 개발 가이드

## 프로젝트 구조

```
llm-benchmark/
├── .github/
│   └── workflows/
│       └── update-data.yml          # 데이터 자동 업데이트
├── index.html                       # 메인 페이지
├── data/
│   ├── raw/                         # 크롤링 원본 데이터
│   │   └── ...                      # (9개 JSON 파일)
│   └── models.json                  # 통합 최종 데이터 (여기만 수정하면 차트 자동 업데이트)
├── scripts/
│   ├── fetch-lmarena.js             # LM Arena 크롤러
│   ├── fetch-aa.js                  # AA API 클라이언트
│   ├── merge-data.js                # 데이터 통합
│   └── ...
├── js/
│   ├── config.js                    # 카테고리, 색상 등 설정
│   ├── data-loader.js               # JSON 로드
│   ├── chart-radar.js               # 레이더 차트
│   ├── chart-bar.js                 # 막대 그래프
│   └── main.js                      # 앱 초기화
└── css/
    ├── reset.css                    # 브라우저 리셋
    ├── variables.css                # CSS 변수
    └── layout.css                   # 레이아웃
```

## 데이터 수정 방법

> **참고**: 데이터는 자동으로 업데이트됩니다 (아래 "자동 데이터 업데이트" 섹션 참고).
> 수동으로 수정하려면 아래 방법을 따르세요.

### 모델 추가
`data/models.json`의 `models` 배열에 객체 추가:

```json
{
  "id": "new-model",
  "name": "새 모델",
  "provider": "제조사",
  "scores": {
    "math": 85,
    "coding": 90,
    "reasoning": 88,
    "creativity": 75,
    "language": 92,
    "context": 87
  }
}
```

### 카테고리 수정
1. `data/models.json`의 `categories` 수정
2. `js/config.js`의 `CATEGORIES` 수정
3. 각 모델의 `scores`에 새 카테고리 점수 추가

## 자동 데이터 업데이트

이 프로젝트는 LM Arena와 Artificial Analysis에서 벤치마크 데이터를 자동으로 수집하는 크롤링 시스템을 사용합니다.

**주요 기능:**
- **자동 실행**: GitHub Actions를 통해 매일 자동 업데이트
- **수동 트리거**: 필요시 Actions 탭에서 수동 실행 가능
- **두 가지 데이터 소스**:
  - LM Arena: Elo 기반 사용자 선호도 점수 (8개 카테고리)
  - Artificial Analysis: 표준 벤치마크 점수 (11개 벤치마크)

### 프로젝트 구조 (확장)

```
llm-benchmark/
├── .github/
│   └── workflows/
│       └── update-data.yml          # 데이터 자동 업데이트 워크플로우
│
├── scripts/                         # 크롤링 스크립트
│   ├── package.json                # Node.js 의존성
│   ├── fetch-lmarena.js            # LM Arena HTML 크롤러
│   ├── fetch-aa.js                 # Artificial Analysis API 클라이언트
│   ├── merge-data.js               # 데이터 통합 스크립트
│   ├── model-mapping.json          # 수동 모델 매핑 테이블
│   └── utils.js                    # 공통 유틸 함수
│
├── data/
│   ├── raw/                        # 원본 크롤링 데이터 (Git 추적)
│   │   ├── lmarena-text.json
│   │   ├── lmarena-text-creative-writing.json
│   │   ├── lmarena-text-math.json
│   │   ├── lmarena-text-coding.json
│   │   ├── lmarena-text-expert.json
│   │   ├── lmarena-text-hard-prompts.json
│   │   ├── lmarena-text-longer-query.json
│   │   ├── lmarena-text-multi-turn.json
│   │   └── aa-models.json
│   └── models.json                 # 최종 통합 데이터
│
├── js/
├── css/
└── index.html
```

### 로컬에서 크롤러 실행

#### 1. 의존성 설치
```bash
cd scripts
npm install
```

#### 2. 개별 스크립트 실행
```bash
# LM Arena 데이터만 크롤링 (8개 카테고리)
npm run fetch-lmarena

# Artificial Analysis 데이터만 가져오기 (API)
# 환경변수 설정 필요 (또는 코드에 하드코딩된 키 사용)
export AA_API_KEY=aa_DcmBnqhrRNXDoYmFjwzSPkEKdPmzUnRJ
npm run fetch-aa

# 데이터 통합 (raw/ → models.json)
npm run merge
```

#### 3. 전체 프로세스 실행
```bash
# 크롤링 → API 호출 → 통합 (한 번에)
npm run update-all
```

#### 4. 결과 확인
- `data/raw/` 폴더: 9개 JSON 파일 (LM Arena 8개 + AA 1개)
- `data/models.json`: 통합된 최종 데이터
- `data/raw/unmatched-models.json`: 매칭 실패한 모델 목록 (있는 경우)

### 모델 매칭 관리

두 사이트에서 모델 이름이 다를 수 있어 자동 매칭이 실패할 수 있습니다.

#### 자동 매칭 방식
```javascript
// 이름 정규화 예시
"gemini-3-pro" → "gemini3pro"
"Gemini 3.0 Pro" → "gemini30pro"
"GPT-5.1 (High)" → "gpt51high"
```

#### 매칭 실패 시 대처법

1. **unmatched-models.json 확인**
   ```bash
   cat data/raw/unmatched-models.json
   ```

2. **model-mapping.json에 수동 매핑 추가**
   ```json
   {
     "gemini-3-pro": "gemini-3.0-pro",
     "gpt-5.1-high": "gpt-5.1-high",
     "claude-opus-4-5-20251101": "claude-opus-4.5"
   }
   ```

   - 키: LM Arena 모델 이름
   - 값: Artificial Analysis 모델 ID 또는 이름

3. **재실행**
   ```bash
   npm run merge
   ```

### GitHub Actions 자동 실행

#### 워크플로우 설정

**파일**: `.github/workflows/update-data.yml`

**실행 조건**:
- **자동**: 매일 UTC 00:00 (한국시간 09:00)
- **수동**: Actions 탭에서 "Run workflow" 버튼 클릭

#### GitHub Secrets 설정

1. Repository Settings → Secrets and variables → Actions
2. New repository secret:
   - Name: `AA_API_KEY`
   - Secret: `aa_DcmBnqhrRNXDoYmFjwzSPkEKdPmzUnRJ`

#### 워크플로우 동작 확인

1. GitHub → Actions 탭
2. "Update Benchmark Data" 워크플로우 선택
3. 최근 실행 기록 확인
4. 실패 시 로그에서 오류 확인

#### 수동 실행 방법

1. GitHub → Actions 탭
2. "Update Benchmark Data" 클릭
3. "Run workflow" 버튼 클릭
4. 브랜치 선택 (보통 main)
5. "Run workflow" 확인

### 데이터 소스

#### LM Arena (lmarena.ai)
- **방식**: HTML 스크래핑 (cheerio)
- **점수 유형**: Elo 기반 사용자 선호도
- **카테고리**:
  - LMArena-Text: 전체 텍스트 응답
  - LMArena-Text-Creative-Writing: 창의적 글쓰기
  - LMArean-Text-Math: 수학 문제
  - LMArena-Text-Coding: 코딩
  - LMArena-Text-Expert: 전문 지식
  - LMArena-Text-Hard-Prompts: 복잡한 지시
  - LMArena-Text-Longer-Query: 긴 프롬프트
  - LMArena-Text-Multi-Turn: 멀티턴 대화

#### Artificial Analysis (artificialanalysis.ai)
- **방식**: REST API
- **점수 유형**: 표준 벤치마크 (0-100)
- **벤치마크**:
  - MMLU Pro: 일반 지식
  - GPQA Diamond: 과학적 추론
  - Humanity's Last Exam: 초고난도 문제
  - AA-LCR: 긴 컨텍스트 추론
  - LiveCodeBench: 코딩
  - SciCode: 과학 코드 작성
  - AIME 2025: 수학 경시
  - MMMU Pro: 시각 이해
  - AA-Omniscience: 종합 환각 점수
  - AA-Omniscience Accuracy: 정답률
  - AA-Omniscience Hallucination Rate: 환각률

### 문제 해결 (크롤링 시스템)

#### 크롤링 실패
**증상**: LM Arena 데이터가 비어있음
**원인**: HTML 구조 변경
**해결**:
1. Actions 로그에서 오류 확인
2. `scripts/fetch-lmarena.js`의 cheerio 선택자 확인
3. 실제 페이지 HTML 구조와 비교하여 수정

#### API 오류 (Artificial Analysis)
**증상**: 403 Forbidden 또는 429 Too Many Requests
**원인**: API 키 만료 또는 일일 제한 초과
**해결**:
1. API 키 유효성 확인
2. 일일 제한 확인 (1,000회)
3. 필요시 새 API 키 발급 (https://artificialanalysis.ai/documentation)

#### 모델 매칭 실패
**증상**: `data/raw/unmatched-models.json`에 많은 모델
**원인**: 이름 정규화 실패
**해결**:
1. unmatched-models.json 확인
2. `scripts/model-mapping.json`에 수동 매핑 추가
3. `npm run merge` 재실행

#### GitHub Actions 워크플로우 실패
**증상**: Actions에서 빨간색 X 표시
**원인**: 환경 설정 문제
**해결**:
1. Secrets에 AA_API_KEY 존재 확인
2. scripts/package.json 의존성 확인
3. Node.js 버전 확인 (20 이상)

## 스타일 수정

### 색상 변경
`css/variables.css`의 CSS 변수 수정:
```css
:root {
  --chart-color-1: #5470c6;  /* 차트 색상 */
  --bg-primary: #ffffff;     /* 배경색 */
}
```

### 차트 크기 조정
`css/variables.css`:
```css
:root {
  --chart-height: 500px;  /* 데스크톱 */
  --chart-height-mobile: 400px;  /* 모바일 */
}
```

## 로컬 테스트

### 방법 1: Live Server (VS Code)
1. Live Server 확장 설치
2. index.html 우클릭 → "Open with Live Server"

### 방법 2: Python 서버
```bash
python -m http.server 8000
# http://localhost:8000 접속
```

## GitHub Pages 배포

1. GitHub 저장소 생성
2. 파일 push
3. Settings → Pages → Source: main branch 선택
4. 배포 완료 (5분 소요)

## 향후 확장 (Phase 4+)

### 필터링 추가
- `js/filter.js` 생성
- `index.html`에 체크박스 추가
- `main.js`에서 import

### 다크모드 추가
- `js/theme.js` 생성
- `css/variables.css`의 `[data-theme="dark"]` 활성화
- 토글 버튼 추가

## 문제 해결

### 차트가 안 보임
- 브라우저 콘솔 확인 (F12)
- ECharts CDN 로드 확인
- `models.json` 경로 확인

### 데이터가 안 나옴
- `models.json` 문법 확인 (JSON Validator)
- fetch 에러 확인 (CORS 문제는 로컬 서버 사용)

## 주의사항

- `models.json`만 수정하면 됨 (하드코딩 X)
- CSS 변수 활용해서 스타일 통일
- ES6 모듈 사용 (type="module")
