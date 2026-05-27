/* =====================================================
   멘탈해빗 (MentalHabit) — script.js
   주요 기능:
     1. 카테고리 탭 전환
     2. 범용 카운트다운 타이머
     3. 4-4-8 호흡 애니메이션 타이머
     4. 뽀모도로 타이머 (25분 집중 / 5분 휴식)
     5. 감사 기록 저장
     6. 감정 점수 팝업 & LocalStorage 저장
     7. 대시보드 렌더링 (요약 카드 + 바 그래프 + 로그 리스트)
   ===================================================== */

'use strict';

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   1. 카테고리 탭 전환
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// 탭 버튼들을 모두 선택
const tabButtons = document.querySelectorAll('.tab-btn');
// 탭 패널들을 모두 선택
const tabPanels  = document.querySelectorAll('.tab-panel');

// 각 탭 버튼에 클릭 이벤트 연결
tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab; // 버튼의 data-tab 속성값 (bio / action / stimulus)

    // 모든 버튼과 패널에서 'active' 클래스 제거
    tabButtons.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-selected', 'false'); });
    tabPanels.forEach(p => p.classList.remove('active'));

    // 클릭한 버튼과 대응하는 패널에 'active' 클래스 추가
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.getElementById('tab-' + target).classList.add('active');
  });
});


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   2. 범용 카운트다운 타이머 (미션 1, 3)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// 타이머 상태를 관리하는 객체
// key: 타이머 ID (예: 'm1'), value: { intervalId, remaining, total }
const timerState = {};

/**
 * 초를 'MM:SS' 형식 문자열로 변환하는 함수
 * @param {number} seconds - 변환할 총 초
 * @returns {string} 'MM:SS' 형식의 문자열
 */
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return m + ':' + s;
}

/**
 * 카운트다운 타이머를 시작하는 함수
 * @param {string} id      - 타이머 식별자 (예: 'm1')
 * @param {number} totalSec - 전체 시간(초)
 */
function startTimer(id, totalSec) {
  // 이미 실행 중인 타이머는 중복 시작하지 않음
  if (timerState[id] && timerState[id].running) return;

  const display = document.getElementById('timer-' + id);

  // 처음 시작하는 경우 초기화
  if (!timerState[id]) {
    timerState[id] = { remaining: totalSec, total: totalSec, running: false, intervalId: null };
  }

  timerState[id].running = true;

  timerState[id].intervalId = setInterval(() => {
    timerState[id].remaining--;

    // 화면에 남은 시간 표시
    display.textContent = formatTime(timerState[id].remaining);

    // 타이머 종료 처리
    if (timerState[id].remaining <= 0) {
      clearInterval(timerState[id].intervalId);
      timerState[id].running = false;
      showToast('⏰ 타이머 완료!');
    }
  }, 1000);
}

/**
 * 타이머를 일시정지하는 함수
 * @param {string} id - 타이머 식별자
 */
function pauseTimer(id) {
  if (!timerState[id] || !timerState[id].running) return;
  clearInterval(timerState[id].intervalId);
  timerState[id].running = false;
}

/**
 * 타이머를 초기 상태로 리셋하는 함수
 * @param {string} id       - 타이머 식별자
 * @param {number} totalSec - 전체 시간(초)
 */
function resetTimer(id, totalSec) {
  if (timerState[id]) {
    clearInterval(timerState[id].intervalId);
  }
  timerState[id] = { remaining: totalSec, total: totalSec, running: false, intervalId: null };
  document.getElementById('timer-' + id).textContent = formatTime(totalSec);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   3. 4-4-8 호흡 애니메이션 타이머 (미션 2)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// 호흡 타이머 관련 변수
let breathIntervalId  = null;  // setInterval ID
let breathRemaining   = 120;   // 남은 시간(초), 2분 = 120초
let breathPhaseTimer  = 0;     // 현재 단계에서 경과한 초
let breathPhaseIndex  = 0;     // 현재 단계 인덱스 (0=흡기, 1=숨참기, 2=호기)
let breathRunning     = false; // 실행 중 여부

// 4-4-8 호흡 단계 정의
// duration: 해당 단계에서 유지할 초, class: CSS 클래스명, label: 화면 표시 문자
const BREATH_PHASES = [
  { duration: 4,  cssClass: 'inhale', label: '흡기\n4초' },
  { duration: 4,  cssClass: 'hold',   label: '참기\n4초' },
  { duration: 8,  cssClass: 'exhale', label: '호기\n8초' },
];

/**
 * 호흡 원 상태를 업데이트하는 함수
 * @param {number} phaseIndex - 단계 인덱스 (0, 1, 2)
 */
function applyBreathPhase(phaseIndex) {
  const circle = document.getElementById('breath-circle');
  const label  = document.getElementById('breath-label');
  const phase  = BREATH_PHASES[phaseIndex];

  // 기존 단계 클래스 모두 제거 후 새 클래스 추가
  circle.classList.remove('inhale', 'hold', 'exhale');
  circle.classList.add(phase.cssClass);

  // 레이블 텍스트 업데이트 (줄바꿈 처리)
  label.textContent = phase.label.replace('\n', ' ');
}

/**
 * 호흡 타이머를 시작하는 함수
 */
function startBreath() {
  if (breathRunning) return; // 이미 실행 중이면 무시
  breathRunning = true;

  // 처음 시작 시 초기 단계 적용
  applyBreathPhase(breathPhaseIndex);

  breathIntervalId = setInterval(() => {
    breathRemaining--;
    breathPhaseTimer++;

    // 남은 전체 시간을 화면에 표시
    document.getElementById('timer-m2').textContent = formatTime(breathRemaining);

    // 현재 단계가 끝나면 다음 단계로 전환
    if (breathPhaseTimer >= BREATH_PHASES[breathPhaseIndex].duration) {
      breathPhaseTimer = 0;
      breathPhaseIndex = (breathPhaseIndex + 1) % BREATH_PHASES.length; // 0→1→2→0 순환
      applyBreathPhase(breathPhaseIndex);
    }

    // 2분 완료
    if (breathRemaining <= 0) {
      clearInterval(breathIntervalId);
      breathRunning = false;
      document.getElementById('breath-label').textContent = '완료!';
      document.getElementById('breath-circle').classList.remove('inhale', 'hold', 'exhale');
      showToast('🌬️ 호흡 훈련 완료!');
    }
  }, 1000);
}

/**
 * 호흡 타이머를 초기화하는 함수
 */
function resetBreath() {
  clearInterval(breathIntervalId);
  breathRunning     = false;
  breathRemaining   = 120;
  breathPhaseTimer  = 0;
  breathPhaseIndex  = 0;

  document.getElementById('timer-m2').textContent = '02:00';
  document.getElementById('breath-label').textContent = '준비';

  const circle = document.getElementById('breath-circle');
  circle.classList.remove('inhale', 'hold', 'exhale');
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   4. 뽀모도로 타이머 (미션 5)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// 뽀모도로 상태 변수
const POMODORO_FOCUS = 25 * 60;  // 집중: 25분(초)
const POMODORO_BREAK = 5  * 60;  // 휴식: 5분(초)

let pomodoroIntervalId  = null;   // setInterval ID
let pomodoroRemaining   = POMODORO_FOCUS; // 남은 시간
let pomodoroTotal       = POMODORO_FOCUS; // 현재 세션의 전체 시간 (진행 바 계산용)
let pomodoroRunning     = false;          // 실행 중 여부
let pomodoroIsFocus     = true;           // true=집중, false=휴식
let pomodoroFocusCount  = 0;              // 완료한 집중 횟수
let pomodoroBreakCount  = 0;              // 완료한 휴식 횟수

/**
 * 뽀모도로 진행 바를 업데이트하는 함수
 */
function updatePomodoroProgress() {
  const elapsed  = pomodoroTotal - pomodoroRemaining;
  const percent  = Math.min((elapsed / pomodoroTotal) * 100, 100);
  document.getElementById('pomodoro-progress').style.width = percent + '%';
}

/**
 * 뽀모도로 타이머를 시작하는 함수
 */
function startPomodoro() {
  if (pomodoroRunning) return;
  pomodoroRunning = true;

  pomodoroIntervalId = setInterval(() => {
    pomodoroRemaining--;
    document.getElementById('timer-m5').textContent = formatTime(pomodoroRemaining);
    updatePomodoroProgress();

    // 현재 세션 완료
    if (pomodoroRemaining <= 0) {
      if (pomodoroIsFocus) {
        // 집중 세션 완료 → 휴식 세션으로 전환
        pomodoroFocusCount++;
        document.getElementById('pomodoro-count').textContent = pomodoroFocusCount;
        showToast('🍅 집중 완료! 5분 휴식을 시작합니다.');

        pomodoroIsFocus   = false;
        pomodoroRemaining = POMODORO_BREAK;
        pomodoroTotal     = POMODORO_BREAK;
        document.getElementById('pomodoro-mode-label').textContent = '☕ 휴식 모드';
        document.getElementById('timer-m5').style.color = 'var(--color-success)';
      } else {
        // 휴식 세션 완료 → 집중 세션으로 전환
        pomodoroBreakCount++;
        document.getElementById('break-count').textContent = pomodoroBreakCount;
        showToast('⚡ 휴식 완료! 다시 집중 세션을 시작합니다.');

        pomodoroIsFocus   = true;
        pomodoroRemaining = POMODORO_FOCUS;
        pomodoroTotal     = POMODORO_FOCUS;
        document.getElementById('pomodoro-mode-label').textContent = '🍅 집중 모드';
        document.getElementById('timer-m5').style.color = 'var(--color-secondary)';
      }
      updatePomodoroProgress();
    }
  }, 1000);
}

/**
 * 뽀모도로 타이머를 일시정지하는 함수
 */
function pausePomodoro() {
  if (!pomodoroRunning) return;
  clearInterval(pomodoroIntervalId);
  pomodoroRunning = false;
}

/**
 * 뽀모도로 타이머를 전체 초기화하는 함수
 */
function resetPomodoro() {
  clearInterval(pomodoroIntervalId);
  pomodoroRunning    = false;
  pomodoroIsFocus    = true;
  pomodoroRemaining  = POMODORO_FOCUS;
  pomodoroTotal      = POMODORO_FOCUS;
  pomodoroFocusCount = 0;
  pomodoroBreakCount = 0;

  document.getElementById('timer-m5').textContent       = formatTime(POMODORO_FOCUS);
  document.getElementById('timer-m5').style.color       = 'var(--color-secondary)';
  document.getElementById('pomodoro-mode-label').textContent = '🍅 집중 모드';
  document.getElementById('pomodoro-progress').style.width   = '0%';
  document.getElementById('pomodoro-count').textContent = '0';
  document.getElementById('break-count').textContent    = '0';
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   5. 감사/성취 기록 저장 (미션 4)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * 감사·성취 항목 3개를 LocalStorage에 저장하는 함수
 * 입력값이 비어 있으면 저장하지 않고 경고
 */
function saveGratitude() {
  const v1 = document.getElementById('gratitude-1').value.trim();
  const v2 = document.getElementById('gratitude-2').value.trim();
  const v3 = document.getElementById('gratitude-3').value.trim();

  // 하나라도 빈 칸이면 저장 거부
  if (!v1 || !v2 || !v3) {
    showToast('⚠️ 3가지 항목을 모두 입력해 주세요.');
    return;
  }

  // 기존에 저장된 감사 목록 불러오기
  const saved = JSON.parse(localStorage.getItem('mh_gratitude') || '[]');

  // 새 항목 추가
  saved.unshift({
    date: new Date().toLocaleDateString('ko-KR'),
    items: [v1, v2, v3]
  });

  // 최대 30일치만 보관 (불필요한 스토리지 낭비 방지)
  if (saved.length > 30) saved.pop();

  localStorage.setItem('mh_gratitude', JSON.stringify(saved));

  // 입력창 비우기
  document.getElementById('gratitude-1').value = '';
  document.getElementById('gratitude-2').value = '';
  document.getElementById('gratitude-3').value = '';

  showToast('💚 오늘의 감사 기록이 저장되었습니다!');
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   6. 감정 점수 팝업 & LocalStorage 데이터 로그
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// 현재 완료 처리 중인 미션 이름을 임시 저장하는 변수
let pendingMissionName = '';

// 감정 점수별 이모지·설명 매핑
const EMOTION_MAP = {
  1:  { emoji: '😩', text: '1점 — 매우 힘들다' },
  2:  { emoji: '😞', text: '2점 — 힘들다' },
  3:  { emoji: '😔', text: '3점 — 좀 힘들다' },
  4:  { emoji: '😕', text: '4점 — 약간 안 좋다' },
  5:  { emoji: '😐', text: '5점 — 보통' },
  6:  { emoji: '🙂', text: '6점 — 괜찮다' },
  7:  { emoji: '😊', text: '7점 — 좋다' },
  8:  { emoji: '😄', text: '8점 — 꽤 좋다' },
  9:  { emoji: '😁', text: '9점 — 매우 좋다' },
  10: { emoji: '🤩', text: '10점 — 최고!!' },
};

/**
 * 미션 완료 버튼 클릭 시 감정 점수 팝업을 여는 함수
 * @param {string} missionName - 완료한 미션의 이름
 */
function completeMission(missionName) {
  pendingMissionName = missionName;

  // 팝업에 미션 이름 표시
  document.getElementById('popup-mission-name').textContent = missionName;

  // 슬라이더 기본값 5점으로 리셋
  const slider = document.getElementById('emotion-slider');
  slider.value = 5;
  updateEmotionLabel(5);

  // 팝업 표시
  document.getElementById('emotion-popup').classList.add('visible');
}

/**
 * 슬라이더 값이 바뀔 때 이모지와 설명 텍스트를 업데이트하는 함수
 * @param {number|string} value - 슬라이더 현재 값 (1~10)
 */
function updateEmotionLabel(value) {
  const score = parseInt(value, 10);
  const info  = EMOTION_MAP[score] || EMOTION_MAP[5];
  document.getElementById('emotion-emoji').textContent      = info.emoji;
  document.getElementById('emotion-score-text').textContent = info.text;
}

/**
 * 팝업을 닫는 함수
 */
function closePopup() {
  document.getElementById('emotion-popup').classList.remove('visible');
}

/**
 * 감정 점수를 LocalStorage에 저장하고 대시보드를 업데이트하는 함수
 */
function saveEmotionScore() {
  const score = parseInt(document.getElementById('emotion-slider').value, 10);

  // 저장할 로그 항목 구성
  const logEntry = {
    timestamp:   new Date().toISOString(),            // ISO 형식의 날짜+시간 (정렬용)
    dateLabel:   new Date().toLocaleString('ko-KR'),  // 화면 표시용 날짜 문자열
    mission:     pendingMissionName,                  // 완료한 미션 이름
    score:       score,                               // 감정 점수 (1~10)
  };

  // 기존 로그 불러오기 → 새 항목 맨 앞에 추가
  const logs = getLog();
  logs.unshift(logEntry);

  // 최대 100개 항목만 유지
  if (logs.length > 100) logs.pop();

  // LocalStorage에 저장
  localStorage.setItem('mh_log', JSON.stringify(logs));

  closePopup();
  showToast('📝 기록 완료! 감정 점수: ' + score + '점');

  // 대시보드 새로고침
  renderDashboard();
}

/**
 * LocalStorage에서 감정 로그를 불러오는 함수
 * @returns {Array} 로그 항목 배열
 */
function getLog() {
  return JSON.parse(localStorage.getItem('mh_log') || '[]');
}

/**
 * 전체 로그를 초기화하는 함수 (확인 창 포함)
 */
function clearLog() {
  if (!confirm('모든 기록을 삭제할까요?')) return;
  localStorage.removeItem('mh_log');
  renderDashboard();
  showToast('🗑️ 기록이 초기화되었습니다.');
}

// 팝업 외부 클릭 시 닫기
document.getElementById('emotion-popup').addEventListener('click', function(e) {
  if (e.target === this) closePopup();
});


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   7. 대시보드 렌더링
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/**
 * 대시보드 전체를 다시 그리는 함수
 * (요약 카드 + 바 그래프 + 로그 리스트 모두 업데이트)
 */
function renderDashboard() {
  const logs = getLog();

  // ── 7-1. 요약 카드 ──
  const total   = logs.length;
  const avgScore = total > 0
    ? (logs.reduce((sum, l) => sum + l.score, 0) / total).toFixed(1)
    : '—';

  // 오늘 날짜 문자열 (YYYY. M. D. 형식으로 toLocaleDateString 결과와 비교)
  const todayStr = new Date().toLocaleDateString('ko-KR');
  const todayCount = logs.filter(l => l.dateLabel.startsWith(todayStr)).length;

  document.getElementById('summary-total').textContent = total;
  document.getElementById('summary-avg').textContent   = avgScore;
  document.getElementById('summary-today').textContent = todayCount;

  // ── 7-2. CSS 바 그래프 (최근 10개) ──
  const chartEl = document.getElementById('bar-chart');
  chartEl.innerHTML = '';

  if (logs.length === 0) {
    chartEl.innerHTML = '<p class="empty-log">아직 기록이 없습니다. 미션을 완료하면 여기에 그래프가 나타납니다.</p>';
  } else {
    // 최신 10개를 역순(오래된 것부터)으로 정렬하여 그래프에 표시
    const recent = logs.slice(0, 10).reverse();
    const maxBarH = 70; // 바의 최대 높이(px) — 10점일 때의 높이

    recent.forEach(entry => {
      // 감정 점수에 비례해 바 높이 계산
      const barHeight = Math.round((entry.score / 10) * maxBarH);

      // 날짜 레이블을 짧게 표시 (시간 부분만)
      const timePart = entry.dateLabel.split(' ').slice(-2).join(' ');

      // 바 컬럼 HTML 생성
      const col = document.createElement('div');
      col.className = 'bar-col';
      col.innerHTML = `
        <span class="bar-score">${entry.score}</span>
        <div class="bar-fill" style="height: ${barHeight}px;" title="${entry.mission} — ${entry.score}점"></div>
        <span class="bar-date">${timePart}</span>
      `;
      chartEl.appendChild(col);
    });
  }

  // ── 7-3. 로그 리스트 (최근 20개) ──
  const listEl = document.getElementById('log-list');
  listEl.innerHTML = '';

  if (logs.length === 0) {
    listEl.innerHTML = '<li class="empty-log">기록이 없습니다.</li>';
    return;
  }

  const recentLogs = logs.slice(0, 20);
  recentLogs.forEach(entry => {
    const li = document.createElement('li');
    li.className = 'log-item';

    // 감정 점수 뱃지 색상: 점수에 따라 다르게 표시
    const scoreColor = entry.score >= 7 ? 'var(--color-success)'
                     : entry.score >= 4 ? 'var(--color-primary)'
                     :                    'var(--color-danger)';

    li.innerHTML = `
      <span class="log-item-score" style="color: ${scoreColor}">${entry.score}</span>
      <div class="log-item-info">
        <div class="log-item-mission">${entry.mission}</div>
        <div class="log-item-time">${entry.dateLabel}</div>
      </div>
    `;
    listEl.appendChild(li);
  });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   8. 유틸리티 — 토스트 알림
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// 토스트 타임아웃 ID (연속 호출 시 이전 타임아웃 취소용)
let toastTimeout = null;

/**
 * 화면 하단에 잠깐 나타나는 알림 메시지를 표시하는 함수
 * @param {string} message - 표시할 메시지
 * @param {number} duration - 표시 지속 시간(ms), 기본 2500ms
 */
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  // 이전 타임아웃이 있으면 취소
  if (toastTimeout) clearTimeout(toastTimeout);

  // 지정된 시간 후 토스트 숨기기
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   9. 초기화 — 페이지 로드 시 실행
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

// DOM이 모두 준비된 후 대시보드를 렌더링하여
// 이전에 저장된 기록을 즉시 보여줌
document.addEventListener('DOMContentLoaded', () => {
  renderDashboard();
});
