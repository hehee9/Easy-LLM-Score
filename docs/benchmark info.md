# Benchmake Info

## 개요

각각의 벤치마크가 어떤 성능을 의미하는지 설명한 문서이다.

## 분류

### Artificial Analysis

다양한 상용 벤치마크 및 자체 개발 벤치마크를 동일한 환경에서 직접 실행한 후, 그 결과를 공유하는 사이트이다.

| 벤치마크 이름 |      설명      | 비고 |
| ----------- | ------------- | ---- |
| **MMLU Pro** | 일반적이고 다양한 지식 | |
| **GPQA Diamond** | 과학적 추론 능력 | |
| **Humanity's Last Exam** | 다양한 과목에 대한 초고난도 문제 | |
| **AA-LCR** | 긴 컨텍스트에서의 추론 | |
| **LiveCodeBench** | 지속적으로 문제가 업데이트되는 코딩 벤치마크 | |
| **SciCode** | 과학 연구를 위한 코드 작성 | |
| **𝜏²-Bench Telecom** | 도구 사용 능력 | |
| **Terminal-Bench Hard** | 도구 및 Terminal 사용 능력 | |
| **IFBench** | 지시 이행 | |
| **AIME 2025** | 수학 경시대회 문제 | |
| **CritPt** | 현실 세계의 물리적 작용 계산 | |
| **MMMU Pro** | 시각 정보를 활용한 추론 | |
| **AA-Omniscience** | 종합적 환각 점수 측정 | 음수 가능 (-100~100) |
| **AA-Omniscience Accuracy** | 옳은 정답의 비율 | 오답 여부를 무시한 점수 |
| **AA-Omniscience Hallucination Rate** | 잘못된 답변의 비율 | 모르겠다고 하거나 거절해야 할 때 거짓 답변을 하는 점수, 낮을수록 좋음 |
...

### LM Arena

동일한 프롬프트를 익명의 두 모델에 입력하고, 더 나은 것을 투표로 모아 점수를 매기는 사이트이다. 즉, 항상 상대 평가이며, 사용자의 실제 체감을 기반으로 한다.

| 벤치마크 이름 |      설명      | 비고 |
| ----------- | ------------- | ---- |
| **LMArena-Text** | 텍스트 기반 응답 총합 선호도 | |
| **LMArena-Text-Creative-Writing** | 창의적 글쓰기 선호도 | |
| **LMArean-Text-Math** | 수학 문제 풀이 선호도 | |
| **LMArena-Text-Coding** | 코딩 선호도 | |
| **LMArena-Text-Instruction-Following** | 지시 이행 선호도 | |
| **LMArena-Text-Multi-Turn** | 멀티 턴(장기 대화) 선호도 | |
| **LMArena-Text-Hard-Prompts** | 복잡한 지시에 대한 선호도 | |
| **LMArena-Text-Expert** | 전문 분야에서의 선호도 | |
| **LMArena-Text-Longer-Query** | 긴 프롬프트에서의 선호도 | |
...