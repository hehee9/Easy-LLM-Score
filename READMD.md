# LLM 성능 비교 차트

## 기본 아이디어

- 각종 LLM의 성능 지표를 숫자가 아닌 막대 그래프, 레이더 차트에 기반하여 보여줌
  - 체크박스, 필터링 등으로 조건을 만족하는 모델만 모아서 비교 가능
- 전문 용어가 아닌 '수학 실력', '부드러운 말투'처럼 대중에게 익숙한 용어를 사용함
- Github Pages를 이용해 무료로 호스팅

## 간단한 구조

```
llm-benchmark/
├── index.html
├── data/
│   └── models.json
├── js/
│   ├── chart.js
│   └── comparison.js
└── css/
    └── style.css
```