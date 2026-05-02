import React, { useState, useEffect, useCallback } from 'react';
import { Check, Plus, X, Home, Clock, History, Settings, Trash2, Trophy, AlertCircle, KeyRound, Loader2, Pencil, Sparkles, Lock, Flame, Target, Wallet, DollarSign } from 'lucide-react';

// Chore icons — grouped by category for readability (the UI shows them in a grid)
const EMOJI_OPTIONS = [
  // Bedroom
  '🛏️', '🧸', '📚', '🎒', '👕', '🧺', '🧦',
  // Kitchen / eating
  '🍽️', '🍴', '🥣', '🧽', '🥄', '🍎', '🥛', '🧃', '🍞', '🥗', '🍳', '🧊',
  // Cleaning
  '🧹', '🧼', '🧴', '🗑️', '♻️', '🧻', '🪣', '🧯', '🪒',
  // Bathroom / self-care
  '🪥', '🚿', '🛁', '💧', '🧴',
  // Pets
  '🐕', '🐈', '🐇', '🐟', '🦜', '🐾', '🥩',
  // Outdoors / garden
  '🌱', '🪴', '🌻', '🍃', '🍂', '🌳', '🌲', '🪵', '🧑‍🌾',
  // School / homework
  '✏️', '📝', '📖', '🎨', '🖌️', '📐', '🎒', '📓',
  // Active / sports
  '⚽', '🏀', '⚾', '🎾', '🏈', '🏐', '🚲', '🛴', '🛹', '🏊', '🧘',
  // Car / chores around the house
  '🚗', '🧰', '🔧', '🪑', '🚪', '💡', '📦',
  // Music / fun
  '🎵', '🎹', '🎸', '🎤', '🎮',
  // Misc helpful
  '🛏️', '🧑‍🍳', '🛒', '💰', '⏰', '📅', '✅', '⭐',
];

// De-duplicate while preserving order
const DEDUPED_EMOJI_OPTIONS = [...new Set(EMOJI_OPTIONS)];

// Kid avatars — animals and friendly faces
const KID_AVATARS = [
  // Original favorites
  '🦊', '🐻', '🐼', '🦁', '🐰', '🐸', '🐯', '🦄', '🐨', '🐵', '🐶', '🐱',
  // More animals
  '🐺', '🐷', '🐮', '🐹', '🐭', '🐧', '🐥', '🐣', '🦆', '🦉', '🦅', '🦋',
  '🐙', '🦑', '🐠', '🐳', '🐬', '🦈', '🐢', '🦎', '🐲', '🦖', '🦕',
  '🦒', '🦓', '🐘', '🦏', '🦛', '🐪', '🦘', '🦥', '🐿️', '🦔',
  // Fun faces / characters
  '😀', '😎', '🤠', '🥳', '🤖', '👾', '👽', '👻', '🎃', '🧚', '🧙', '🦸', '🦹', '🧛',
];

const DEDUPED_KID_AVATARS = [...new Set(KID_AVATARS)];

// Parent avatars — expanded for variety
const PARENT_AVATARS = [
  '👨', '👩', '🧔', '👱', '👨‍🦰', '👩‍🦰', '👨‍🦱', '👩‍🦱',
  '👨‍🦳', '👩‍🦳', '👨‍🦲', '👩‍🦲', '🧑', '🧑‍🦱', '🧑‍🦰', '🧑‍🦳',
  '👨‍💼', '👩‍💼', '👨‍⚕️', '👩‍⚕️', '👨‍🏫', '👩‍🏫', '👨‍🍳', '👩‍🍳',
  '👨‍🌾', '👩‍🌾', '🦸‍♂️', '🦸‍♀️',
];

const DEDUPED_PARENT_AVATARS = [...new Set(PARENT_AVATARS)];

// Cadences for chores — labels used in both dropdowns and in the Extras section headers
const CADENCE_OPTIONS = [
  { value: 'daily',    label: 'Daily',          short: 'daily' },
  { value: 'weekly',   label: 'Weekly',         short: 'weekly' },
  { value: 'biweekly', label: 'Every 2 weeks',  short: 'biweekly' },
  { value: 'monthly',  label: 'Monthly',        short: 'monthly' },
];

// Header text for each cadence group in the Extras section
const CADENCE_LABELS = {
  daily:    'Every day · resets tomorrow',
  weekly:   'Once a week · resets Sunday',
  biweekly: 'Every 2 weeks',
  monthly:  'Once a month · resets the 1st',
};
const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316'];

const todayStr = () => new Date().toISOString().split('T')[0];

// ============ API CLIENT ============
const api = {
  getFamily: () => fetch('/api/family').then(r => r.json()),
  verifyPin: (id, pin) => fetch('/api/parents/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pin }) }),
  changePin: (id, currentPin, newPin) => fetch(`/api/parents/${id}/pin`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPin, newPin }) }),
  addKid: (data) => fetch('/api/kids', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateKid: (id, data) => fetch(`/api/kids/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  removeKid: (id) => fetch(`/api/kids/${id}`, { method: 'DELETE' }),
  addChore: (data) => fetch('/api/chores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateChore: (id, data) => fetch(`/api/chores/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  removeChore: (id) => fetch(`/api/chores/${id}`, { method: 'DELETE' }),
  addParent: (data) => fetch('/api/parents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateParent: (id, data) => fetch(`/api/parents/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  removeParent: (id) => fetch(`/api/parents/${id}`, { method: 'DELETE' }),
  addCompletion: (data) => fetch('/api/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateCompletion: (id, status) => fetch(`/api/completions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }),
  removeCompletion: (id) => fetch(`/api/completions/${id}`, { method: 'DELETE' }),
  addGoal: (data) => fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateGoal: (id, data) => fetch(`/api/goals/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  removeGoal: (id) => fetch(`/api/goals/${id}`, { method: 'DELETE' }),
  addPayout: (data) => fetch('/api/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  removePayout: (id) => fetch(`/api/payouts/${id}`, { method: 'DELETE' }),
  addCustomCompletion: (data) => fetch('/api/custom-completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  updateCustomCompletion: (id, data) => fetch(`/api/custom-completions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  removeCustomCompletion: (id) => fetch(`/api/custom-completions/${id}`, { method: 'DELETE' }),
};

export default function App() {
  const [family, setFamily] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [pinTarget, setPinTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    try {
      const data = await api.getFamily();
      setFamily(data);
      setError(null);
    } catch (e) {
      setError('Could not reach the server. Is it running?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // Auto-refresh every 15s so family members on different devices see updates
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(reload, 15000);
    return () => clearInterval(interval);
  }, [currentUser, reload]);

  // ============ HELPERS ============
  const getChoresForKid = (kidId) => family?.chores.filter(c => c.assignedTo === kidId) || [];
  const getExtraChores = () => family?.chores.filter(c => c.assignedTo === null || c.assignedTo === undefined) || [];

  const isChoreCompletedToday = (choreId, kidId) =>
    family?.completions.some(c => c.choreId === choreId && c.kidId === kidId && c.date === todayStr() && c.status !== 'rejected');

  const getChoreStatusToday = (choreId, kidId) =>
    family?.completions.find(c => c.choreId === choreId && c.kidId === kidId && c.date === todayStr())?.status || null;

  // Compute the current period start date for a chore based on its frequency.
  // Matches the backend logic exactly.
  const periodStart = (frequency, dateStr = todayStr()) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    if (frequency === 'daily') return dateStr;
    if (frequency === 'weekly') {
      const dow = d.getUTCDay();
      d.setUTCDate(d.getUTCDate() - dow);
      return d.toISOString().split('T')[0];
    }
    if (frequency === 'biweekly') {
      const dow = d.getUTCDay();
      const weekStart = new Date(d);
      weekStart.setUTCDate(d.getUTCDate() - dow);
      // Anchor to 2023-01-01 (a Sunday) and take even-week alignment
      const REF = Date.UTC(2023, 0, 1);
      const weeksSinceRef = Math.floor((weekStart.getTime() - REF) / (7 * 86400000));
      const slotOffset = weeksSinceRef % 2;
      if (slotOffset > 0) weekStart.setUTCDate(weekStart.getUTCDate() - 7 * slotOffset);
      return weekStart.toISOString().split('T')[0];
    }
    if (frequency === 'monthly') {
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
    }
    return dateStr;
  };

  // Returns all active (approved/pending) claims for this Extra Chore in its current period.
  // Each entry: { kidId, status, completionId, date }
  const getExtraClaimsInPeriod = (chore) => {
    if (!family) return [];
    const ws = periodStart(chore.frequency);
    return family.completions
      .filter(c => c.choreId === chore.id && c.date >= ws && c.status !== 'rejected')
      .map(c => ({ kidId: c.kidId, status: c.status, completionId: c.id, date: c.date }));
  };

  // Eligibility for Extra Chores:
  // A kid is eligible if they completed all required chores EITHER last week OR this week so far.
  // This gives kids a grace period from last week's performance, plus a way to redeem themselves mid-week.
  //
  // "Completed a required chore" means:
  //   - Weekly chore: has any approved/pending completion in that week's window
  //   - Daily chore: has approved/pending completions for every applicable day in that window
  //     (for the current week, that means every day from Sunday through today, inclusive;
  //      for last week, every day of that full week)
  const getWeekBounds = (weekOffset) => {
    const today = new Date(todayStr());
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek - (weekOffset * 7));
    const end = new Date(start);
    if (weekOffset > 0) {
      // Past week: include all 7 days
      end.setDate(start.getDate() + 6);
    } else {
      // Current week: only count up to today
      end.setTime(today.getTime());
    }
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
    };
  };

  // Returns all dates (inclusive) from start to end
  const datesInRange = (startStr, endStr) => {
    const dates = [];
    const cur = new Date(startStr);
    const end = new Date(endStr);
    while (cur <= end) {
      dates.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return dates;
  };

  // Checks if a kid has satisfied ALL their required chores within a given week window
  const requiredChoresSatisfied = (kidId, weekOffset) => {
    const required = (family?.chores || []).filter(
      c => c.assignedTo === kidId && c.isRequiredForExtras
    );
    if (required.length === 0) return true;

    const { startStr, endStr } = getWeekBounds(weekOffset);
    const allDates = datesInRange(startStr, endStr);

    return required.every(chore => {
      const compsForThis = (family?.completions || []).filter(c =>
        c.choreId === chore.id &&
        c.kidId === kidId &&
        c.date >= startStr &&
        c.date <= endStr &&
        (c.status === 'approved' || c.status === 'pending')
      );
      if (chore.frequency === 'weekly') {
        return compsForThis.length > 0;
      }
      // daily: every date in the window must have a completion
      const completedDates = new Set(compsForThis.map(c => c.date));
      return allDates.every(d => completedDates.has(d));
    });
  };

  const isEligibleForExtras = (kidId) => {
    if (!family) return false;
    const required = family.chores.filter(c => c.assignedTo === kidId && c.isRequiredForExtras);
    if (required.length === 0) return true;
    // Eligible if last week satisfied OR this week satisfied so far
    return requiredChoresSatisfied(kidId, 1) || requiredChoresSatisfied(kidId, 0);
  };

  // Returns list of required chores the kid still needs to complete to earn eligibility *via this week*.
  // If they're already eligible via last week, this returns [] (nothing blocks them).
  const getOutstandingWeeklies = (kidId) => {
    if (!family) return [];
    const required = family.chores.filter(c => c.assignedTo === kidId && c.isRequiredForExtras);
    if (required.length === 0) return [];

    // If eligible via last week, the kid is already unlocked
    if (requiredChoresSatisfied(kidId, 1)) return [];

    // Otherwise show what they need this week
    const { startStr, endStr } = getWeekBounds(0);
    const allDates = datesInRange(startStr, endStr);

    return required.filter(chore => {
      const compsForThis = (family.completions || []).filter(c =>
        c.choreId === chore.id &&
        c.kidId === kidId &&
        c.date >= startStr &&
        c.date <= endStr &&
        (c.status === 'approved' || c.status === 'pending')
      );
      if (chore.frequency === 'weekly') return compsForThis.length === 0;
      const completedDates = new Set(compsForThis.map(c => c.date));
      return !allDates.every(d => completedDates.has(d));
    });
  };

  // ============ BALANCE / PAYOUTS / GOALS / STREAKS ============
  // Total lifetime earnings (all approved completions across all time + weekly bonuses for perfect weeks in the past)
  // Lifetime earnings: sum of all approved chore values + approved "Other" entries + earned weekly bonuses.
  // Weekly bonuses are credited automatically once a perfect week is achieved.
  const getLifetimeEarnings = (kidId) => {
    if (!family) return 0;
    const choreSum = family.completions
      .filter(c => c.kidId === kidId && c.status === 'approved')
      .reduce((sum, c) => {
        const ch = family.chores.find(ch => ch.id === c.choreId);
        return sum + (ch?.value || 0);
      }, 0);
    const customSum = (family.customCompletions || [])
      .filter(c => c.kidId === kidId && c.status === 'approved')
      .reduce((sum, c) => sum + (c.value || 0), 0);

    // Walk back through past weeks and add bonuses for any "perfect week" the kid achieved.
    // Only count fully-completed past weeks; the current week's bonus is added only once it's earned.
    let bonusSum = 0;
    for (let w = 0; w < 104; w++) { // up to 2 years back
      const weekData = getBonusForWeek(kidId, w);
      bonusSum += weekData;
    }
    return choreSum + customSum + bonusSum;
  };

  // Compute just the bonus for a given week offset (0 = this week, 1 = last week, etc.)
  // Returns the bonus amount (kid.weeklyAllowance) if all required chores were completed that week, else 0.
  const getBonusForWeek = (kidId, weekOffset) => {
    if (!family) return 0;
    const kid = family.kids.find(k => k.id === kidId);
    if (!kid || !kid.weeklyAllowance) return 0;
    const requiredChores = family.chores.filter(c => c.assignedTo === kidId && c.isRequiredForExtras);
    if (requiredChores.length === 0) return 0;

    const today = new Date(todayStr());
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek - (weekOffset * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const weekDates = [];
    const walker = new Date(weekStart);
    while (walker <= weekEnd) {
      weekDates.push(walker.toISOString().split('T')[0]);
      walker.setDate(walker.getDate() + 1);
    }

    const allDone = requiredChores.every(ch => {
      const completionsForThis = family.completions.filter(
        c => c.kidId === kidId && c.choreId === ch.id && c.status === 'approved'
          && c.date >= weekStartStr && c.date <= weekEndStr
      );
      if (ch.frequency === 'daily') {
        const completedDates = new Set(completionsForThis.map(c => c.date));
        // For current week, only check days up through today (don't penalize for unfinished days)
        const todayLocal = todayStr();
        const datesNeeded = weekOffset === 0 ? weekDates.filter(d => d <= todayLocal) : weekDates;
        return datesNeeded.every(d => completedDates.has(d));
      }
      return completionsForThis.length > 0;
    });

    return allDone ? kid.weeklyAllowance : 0;
  };

  const getTotalPaidOut = (kidId) => {
    if (!family?.payouts) return 0;
    return family.payouts
      .filter(p => p.kidId === kidId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  // Current unpaid balance = lifetime earnings - total paid out
  const getCurrentBalance = (kidId) => {
    return Math.max(0, getLifetimeEarnings(kidId) - getTotalPaidOut(kidId));
  };

  const getGoalsForKid = (kidId) => (family?.goals || []).filter(g => g.kidId === kidId);

  // Streak = consecutive weeks where the kid completed ALL required chores
  // A week "counts" if every required chore was completed at least once (daily ones need every day)
  const getStreak = (kidId) => {
    if (!family) return { current: 0, best: 0 };
    const requiredChores = family.chores.filter(c => c.assignedTo === kidId && c.isRequiredForExtras);
    if (requiredChores.size === 0 || requiredChores.length === 0) return { current: 0, best: 0 };

    // Helper: did the kid complete all required chores in a given week window?
    const weekComplete = (weekStartDate) => {
      const ws = new Date(weekStartDate);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      const wsStr = ws.toISOString().split('T')[0];
      const weStr = we.toISOString().split('T')[0];
      const weekDates = [];
      const walker = new Date(ws);
      while (walker <= we) {
        weekDates.push(walker.toISOString().split('T')[0]);
        walker.setDate(walker.getDate() + 1);
      }
      return requiredChores.every(ch => {
        const completionsForThis = family.completions.filter(
          c => c.kidId === kidId && c.choreId === ch.id && c.status === 'approved'
            && c.date >= wsStr && c.date <= weStr
        );
        if (ch.frequency === 'daily') {
          const completedDates = new Set(completionsForThis.map(c => c.date));
          // Allow current week to be incomplete for today and future days
          const today = todayStr();
          const daysToCheck = weekDates.filter(d => d <= today);
          return daysToCheck.every(d => completedDates.has(d));
        }
        return completionsForThis.length > 0;
      });
    };

    // Find the start of the current week (Sunday)
    const today = new Date(todayStr());
    const dayOfWeek = today.getDay();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - dayOfWeek);

    // Walk backwards week by week counting consecutive complete weeks
    let current = 0;
    for (let w = 0; w < 104; w++) { // max 2 years back
      const ws = new Date(currentWeekStart);
      ws.setDate(currentWeekStart.getDate() - w * 7);
      if (weekComplete(ws)) {
        current++;
      } else if (w === 0) {
        // Current week not done yet — don't break streak, just don't count it
        continue;
      } else {
        break;
      }
    }

    // Best streak: scan all weeks that have any completion and find longest run
    let best = 0, run = 0;
    for (let w = 103; w >= 0; w--) {
      const ws = new Date(currentWeekStart);
      ws.setDate(currentWeekStart.getDate() - w * 7);
      if (weekComplete(ws)) {
        run++;
        if (run > best) best = run;
      } else {
        run = 0;
      }
    }

    return { current, best: Math.max(best, current) };
  };

  const getPendingApprovals = () => family?.completions.filter(c => c.status === 'pending') || [];
  const getPendingCustomApprovals = () => (family?.customCompletions || []).filter(c => c.status === 'pending');

  const getWeekEarnings = (kidId, weekOffset = 0) => {
    if (!family) return { choreEarnings: 0, bonus: 0, extraEarnings: 0, total: 0, completions: [], weekLabel: '', allDone: false };
    const kid = family.kids.find(k => k.id === kidId);
    if (!kid) return { choreEarnings: 0, bonus: 0, extraEarnings: 0, total: 0, completions: [], weekLabel: '', allDone: false };

    const today = new Date(todayStr());
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek - (weekOffset * 7));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const weekCompletions = family.completions.filter(c =>
      c.kidId === kidId && c.status === 'approved' && c.date >= weekStartStr && c.date <= weekEndStr
    );

    let choreEarnings = 0;
    let extraEarnings = 0;
    weekCompletions.forEach(comp => {
      const ch = family.chores.find(c => c.id === comp.choreId);
      if (!ch) return;
      if (ch.assignedTo === null || ch.assignedTo === undefined) {
        extraEarnings += ch.value || 0;
      } else {
        choreEarnings += ch.value || 0;
      }
    });

    // Approved "Other" custom completions count as extra earnings for the week
    const weekCustomCompletions = (family.customCompletions || []).filter(c =>
      c.kidId === kidId && c.status === 'approved' && c.date >= weekStartStr && c.date <= weekEndStr
    );
    weekCustomCompletions.forEach(c => { extraEarnings += c.value || 0; });

    // Perfect-week bonus: pays when all REQUIRED chores are complete for the week.
    // If the kid has no required chores, no bonus is possible (bonus is a reward, not a raise).
    const requiredChores = getChoresForKid(kidId).filter(c => c.isRequiredForExtras);
    let allDone = false;
    if (requiredChores.length > 0) {
      // Build the set of dates in this week window (for daily chore "every day" check)
      const weekDates = [];
      const walker = new Date(weekStart);
      while (walker <= weekEnd) {
        weekDates.push(walker.toISOString().split('T')[0]);
        walker.setDate(walker.getDate() + 1);
      }
      allDone = requiredChores.every(ch => {
        const completionsForThis = weekCompletions.filter(c => c.choreId === ch.id);
        if (ch.frequency === 'daily') {
          // For current week only check days through today; for past weeks check the whole week
          const completedDates = new Set(completionsForThis.map(c => c.date));
          const todayLocal = todayStr();
          const datesNeeded = weekOffset === 0 ? weekDates.filter(d => d <= todayLocal) : weekDates;
          return datesNeeded.every(d => completedDates.has(d));
        }
        // weekly / biweekly / monthly required chores just need at least one completion in the week
        return completionsForThis.length > 0;
      });
    }
    const bonus = allDone ? kid.weeklyAllowance : 0;

    return {
      choreEarnings,
      extraEarnings,
      bonus,
      total: choreEarnings + extraEarnings + bonus,
      completions: weekCompletions,
      weekLabel: weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Last Week' : `${weekOffset} Weeks Ago`,
      allDone,
    };
  };

  // ============ ACTIONS ============
  const toggleChore = async (choreId, kidId) => {
    const chore = family.chores.find(c => c.id === choreId);
    const isExtra = chore && (chore.assignedTo === null || chore.assignedTo === undefined);

    if (isExtra) {
      // For shared chores: check if THIS kid claimed it today
      const myClaim = family.completions.find(
        c => c.choreId === choreId && c.kidId === kidId && c.date === todayStr() && c.status !== 'rejected'
      );
      if (myClaim) {
        // Un-claim it (only the kid who claimed can do this, or any parent)
        await api.removeCompletion(myClaim.id);
      } else {
        // Enforce eligibility: kids must finish their weekly chores before claiming extras.
        // Parents can always claim on behalf of a kid (override).
        const isParent = currentUser?.role === 'parent';
        if (!isParent && !isEligibleForExtras(kidId)) {
          // Silently block — the button should already be disabled, this is a safety net
          return;
        }
        await api.addCompletion({ choreId, kidId, date: todayStr(), status: isParent ? 'approved' : 'pending' });
      }
    } else {
      const existing = family.completions.find(c => c.choreId === choreId && c.kidId === kidId && c.date === todayStr());
      if (existing) {
        await api.removeCompletion(existing.id);
      } else {
        const isParent = currentUser?.role === 'parent';
        await api.addCompletion({ choreId, kidId, date: todayStr(), status: isParent ? 'approved' : 'pending' });
      }
    }
    reload();
  };

  const approveCompletion = async (id) => { await api.updateCompletion(id, 'approved'); reload(); };
  const rejectCompletion = async (id) => { await api.removeCompletion(id); reload(); };

  const submitCustomCompletion = async ({ kidId, title, icon, value = 0 }) => {
    const isParent = currentUser?.role === 'parent';
    await api.addCustomCompletion({
      kidId, title, icon, date: todayStr(),
      status: isParent ? 'approved' : 'pending',
      value: isParent ? (Number(value) || 0) : 0,
    });
    reload();
  };
  const approveCustomCompletion = async (id, value, edits = {}) => {
    await api.updateCustomCompletion(id, { status: 'approved', value: Number(value) || 0, ...edits });
    reload();
  };
  const rejectCustomCompletion = async (id) => {
    await api.removeCustomCompletion(id);
    reload();
  };

  const logout = () => { setCurrentUser(null); setScreen('dashboard'); };

  const handleProfileSelect = (profile, role) => {
    if (role === 'parent') {
      setPinTarget(profile);
    } else {
      // Kids: no PIN, straight in
      setCurrentUser({ ...profile, role });
      setScreen('dashboard');
    }
  };

  const submitPin = async (pin) => {
    const res = await api.verifyPin(pinTarget.id, pin);
    if (!res.ok) return false;
    const { parent } = await res.json();
    setCurrentUser({ ...parent, role: 'parent' });
    setPinTarget(null);
    setScreen('dashboard');
    return true;
  };

  // ============ RENDER ============
  if (loading) return <FullPageSpinner />;
  if (error) return <ErrorScreen message={error} onRetry={reload} />;
  if (!family) return null;

  if (!currentUser) {
    return (
      <LoginScreen
        family={family}
        onSelectProfile={handleProfileSelect}
        pinTarget={pinTarget}
        onSubmitPin={submitPin}
        onCancelPin={() => setPinTarget(null)}
      />
    );
  }

  const pendingCount = getPendingApprovals().length + getPendingCustomApprovals().length;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl"
                 style={{ background: currentUser.role === 'parent' ? '#FEF3C7' : currentUser.color + '20' }}>
              {currentUser.avatar}
            </div>
            <div>
              <div className="text-xs text-stone-500 font-semibold uppercase tracking-wider">
                {currentUser.role === 'parent' ? 'Parent' : 'Kid'}
              </div>
              <div className="display-font text-xl font-bold text-stone-900 leading-none">Hi, {currentUser.name}</div>
            </div>
          </div>
          <button onClick={logout} className="text-sm font-semibold text-stone-500 hover:text-stone-900 px-3 py-2 rounded-xl hover:bg-stone-100 transition">
            Switch
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-28 pt-6">
        {screen === 'dashboard' && (
          <Dashboard
            currentUser={currentUser}
            family={family}
            onToggleChore={toggleChore}
            isChoreCompletedToday={isChoreCompletedToday}
            getChoreStatusToday={getChoreStatusToday}
            getWeekEarnings={getWeekEarnings}
            getChoresForKid={getChoresForKid}
            getExtraChores={getExtraChores}
            getExtraClaimsInPeriod={getExtraClaimsInPeriod}
            isEligibleForExtras={isEligibleForExtras}
            getOutstandingWeeklies={getOutstandingWeeklies}
            getCurrentBalance={getCurrentBalance}
            getStreak={getStreak}
            getGoalsForKid={getGoalsForKid}
            onSubmitCustom={submitCustomCompletion}
            reload={reload}
          />
        )}
        {screen === 'approvals' && currentUser.role === 'parent' && (
          <Approvals
            family={family}
            pending={getPendingApprovals()}
            pendingCustom={getPendingCustomApprovals()}
            onApprove={approveCompletion}
            onReject={rejectCompletion}
            onApproveCustom={approveCustomCompletion}
            onRejectCustom={rejectCustomCompletion}
          />
        )}
        {screen === 'history' && (
          <HistoryView currentUser={currentUser} family={family} getWeekEarnings={getWeekEarnings} reload={reload} />
        )}
        {screen === 'manage' && currentUser.role === 'parent' && (
          <Manage family={family} reload={reload} currentUser={currentUser} />
        )}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-5xl mx-auto px-2 py-2 flex justify-around">
          <NavButton icon={<Home size={22} />} label="Today" active={screen === 'dashboard'} onClick={() => setScreen('dashboard')} />
          {currentUser.role === 'parent' && (
            <NavButton icon={<Clock size={22} />} label="Approve" active={screen === 'approvals'} onClick={() => setScreen('approvals')} badge={pendingCount} />
          )}
          <NavButton icon={<History size={22} />} label="History" active={screen === 'history'} onClick={() => setScreen('history')} />
          {currentUser.role === 'parent' && (
            <NavButton icon={<Settings size={22} />} label="Manage" active={screen === 'manage'} onClick={() => setScreen('manage')} />
          )}
        </div>
      </nav>
    </div>
  );
}

// ============ LOGIN ============
function LoginScreen({ family, onSelectProfile, pinTarget, onSubmitPin, onCancelPin }) {
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => { setPinInput(''); setPinError(false); }, [pinTarget]);

  const doSubmit = async () => {
    const ok = await onSubmitPin(pinInput);
    if (!ok) {
      setPinError(true);
      setTimeout(() => setPinError(false), 600);
      setPinInput('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FCA5A5 100%)' }}>
      <div className="max-w-2xl w-full">
        <div className="text-center mb-5 float-in">
          <h1 className="display-font text-4xl font-black text-stone-900 leading-none">
            <span className="text-3xl mr-1">⭐</span>Chorely
          </h1>
          <p className="text-stone-700 text-sm font-semibold mt-1">Who's using the app?</p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-4 md:p-5 shadow-2xl border border-white/50 float-in" style={{ animationDelay: '0.1s' }}>
          {family.parents.length > 0 && (
            <div className="mb-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 px-1">Parents</div>
              <div className="flex gap-2 flex-wrap">
                {family.parents.map(p => (
                  <button key={p.id} onClick={() => onSelectProfile(p, 'parent')}
                    className="flex-1 min-w-[120px] bg-white hover:bg-stone-50 rounded-2xl px-3 py-2 flex items-center gap-2 shadow-sm hover:shadow-md transition-all border-2 border-transparent hover:border-stone-300"
                    style={{ '--hover-color': p.color || '#F59E0B' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: (p.color || '#F59E0B') + '20' }}>{p.avatar}</div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-bold text-stone-900 truncate text-sm">{p.name}</div>
                      <div className="text-[10px] text-stone-500 font-semibold flex items-center gap-1"><KeyRound size={9} /> PIN</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-2 px-1">Kids</div>
            {family.kids.length === 0 ? (
              <div className="text-center py-6 text-stone-500 font-semibold text-sm">No kids added yet.</div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                {family.kids.map(k => (
                  <button key={k.id} onClick={() => onSelectProfile(k, 'kid')}
                    className="bg-white hover:bg-stone-50 rounded-2xl p-3 flex flex-col items-center gap-1.5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-transparent"
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = k.color}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl" style={{ background: k.color + '20' }}>{k.avatar}</div>
                    <div className="font-bold text-stone-900 text-sm leading-tight">{k.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {pinTarget && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={onCancelPin}>
          <div className={`bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl pop-in ${pinError ? 'shake' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-5xl mb-2">{pinTarget.avatar}</div>
              <h2 className="display-font text-2xl font-black text-stone-900">Enter PIN</h2>
              <p className="text-sm text-stone-500 mt-1">Hi, {pinTarget.name}</p>
            </div>
            <input
              type="password" inputMode="numeric" pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && doSubmit()}
              autoFocus
              className="w-full text-center text-3xl font-black tracking-[1em] bg-stone-100 rounded-2xl py-4 mb-4 outline-none focus:ring-4 focus:ring-amber-300"
              placeholder="••••" maxLength={4}
            />
            <div className="flex gap-3">
              <button onClick={onCancelPin} className="flex-1 py-3 rounded-2xl font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 transition">Cancel</button>
              <button onClick={doSubmit} className="flex-1 py-3 rounded-2xl font-bold bg-amber-400 hover:bg-amber-500 text-stone-900 transition shadow-lg shadow-amber-200">Enter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ DASHBOARD ============
function Dashboard({ currentUser, family, onToggleChore, isChoreCompletedToday, getChoreStatusToday, getWeekEarnings, getChoresForKid, getExtraChores, getExtraClaimsInPeriod, isEligibleForExtras, getOutstandingWeeklies, getCurrentBalance, getStreak, getGoalsForKid, onSubmitCustom, reload }) {
  const isParent = currentUser.role === 'parent';
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const extraChores = getExtraChores();
  const extrasByCadence = {
    daily:    extraChores.filter(c => c.frequency === 'daily'),
    weekly:   extraChores.filter(c => c.frequency === 'weekly'),
    biweekly: extraChores.filter(c => c.frequency === 'biweekly'),
    monthly:  extraChores.filter(c => c.frequency === 'monthly'),
  };
  // "Other" modal state — can be opened for self (kid) or for a specific kid (parent from a kid card)
  const [otherForKidId, setOtherForKidId] = useState(null);

  if (isParent) {
    return (
      <div className="space-y-6">
        <div className="slide-up">
          <div className="text-sm font-bold text-stone-500 uppercase tracking-wider">{dateStr}</div>
          <h2 className="display-font text-3xl md:text-4xl font-black text-stone-900 mt-1">Today's Progress</h2>
        </div>
        {family.kids.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center slide-up">
            <div className="text-5xl mb-3">👶</div>
            <div className="font-bold text-stone-900">No kids yet</div>
            <div className="text-sm text-stone-500 mt-1">Add a family member in the Manage tab.</div>
          </div>
        )}
        {family.kids.map((kid, i) => {
          const chores = getChoresForKid(kid.id);
          const earnings = getWeekEarnings(kid.id, 0);
          const completedToday = chores.filter(c => isChoreCompletedToday(c.id, kid.id)).length;
          const dailyChores = chores.filter(c => c.frequency === 'daily');
          return (
            <div key={kid.id} className="slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
              <KidDashboardCard
                kid={kid} chores={chores}
                completedToday={completedToday} totalToday={dailyChores.length}
                weekTotal={earnings.total}
                balance={getCurrentBalance ? getCurrentBalance(kid.id) : 0}
                streak={getStreak ? getStreak(kid.id) : { current: 0, best: 0 }}
                goals={getGoalsForKid ? getGoalsForKid(kid.id) : []}
                reload={reload}
                onToggleChore={(cid) => onToggleChore(cid, kid.id)}
                isChoreCompletedToday={(cid) => isChoreCompletedToday(cid, kid.id)}
                getChoreStatusToday={(cid) => getChoreStatusToday(cid, kid.id)}
              />
            </div>
          );
        })}

        {/* "Other" submissions overview for parent — all kids' entries */}
        {(() => {
          const allOthers = (family.customCompletions || [])
            .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
          if (allOthers.length === 0) return null;
          return (
            <div className="slide-up" style={{ animationDelay: '0.28s' }}>
              <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-amber-800 mb-2">✨ "Other" Submissions</div>
                {allOthers.map(cc => {
                  const kid = family.kids.find(k => k.id === cc.kidId);
                  if (!kid) return null;
                  return (
                    <div key={cc.id} className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${cc.status === 'rejected' ? 'bg-red-50' : cc.status === 'approved' ? 'bg-emerald-50' : 'bg-white'}`}>
                      <div className={`text-xl ${cc.status === 'rejected' ? 'opacity-40' : ''}`}>{cc.icon || '✨'}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold truncate ${cc.status === 'rejected' ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{cc.title}</div>
                        <div className="text-xs text-stone-500 font-semibold flex items-center gap-1">
                          <span>{kid.avatar}</span><span>{kid.name}</span><span>·</span><span>{cc.date}</span>
                        </div>
                      </div>
                      {cc.status === 'pending' && <div className="text-xs font-black text-amber-600 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full flex-shrink-0">⏳ Pending</div>}
                      {cc.status === 'approved' && <div className="font-black text-emerald-600 flex-shrink-0">+${(cc.value || 0).toFixed(2)}</div>}
                      {cc.status === 'rejected' && <div className="text-xs font-black text-red-400 bg-red-100 px-2 py-1 rounded-full flex-shrink-0">✗ Rejected</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Extra Chores section for parent view (read-only status of shared chores) */}
        {extraChores.length > 0 && (
          <div className="slide-up" style={{ animationDelay: '0.3s' }}>
            <ExtraChoresSection
              title="Extra Chores"
              subtitle="Anyone in the family can claim these — if they've finished their required chores"
              extrasByCadence={extrasByCadence}
              family={family}
              getExtraClaimsInPeriod={getExtraClaimsInPeriod}
              currentUser={currentUser}
              onToggleChore={onToggleChore}
              isEligibleForExtras={isEligibleForExtras}
              getOutstandingWeeklies={getOutstandingWeeklies}
            />
          </div>
        )}

        {/* "Other" — parent can log an ad-hoc chore for any kid */}
        {family.kids.length > 0 && (
          <div className="slide-up" style={{ animationDelay: '0.35s' }}>
            <button
              onClick={() => setOtherForKidId('__picker__')}
              className="w-full bg-white hover:bg-stone-50 border-2 border-dashed border-stone-300 hover:border-amber-300 rounded-3xl p-4 flex items-center justify-center gap-3 transition group"
            >
              <div className="text-2xl">✨</div>
              <div className="display-font text-base font-black text-stone-900">Log an "Other" for a kid</div>
              <Plus size={20} className="text-stone-400 group-hover:text-amber-500 ml-auto" strokeWidth={3} />
            </button>
          </div>
        )}

        {otherForKidId === '__picker__' && (
          <PickKidThenOtherModal
            family={family}
            onClose={() => setOtherForKidId(null)}
            onPick={(kidId) => setOtherForKidId(kidId)}
          />
        )}
        {otherForKidId && otherForKidId !== '__picker__' && (
          <OtherChoreModal
            kid={family.kids.find(k => k.id === otherForKidId)}
            onClose={() => setOtherForKidId(null)}
            onSubmit={async ({ title, icon }) => {
              await onSubmitCustom({ kidId: otherForKidId, title, icon });
              setOtherForKidId(null);
            }}
            isParent={isParent}
          />
        )}
      </div>
    );
  }

  const chores = getChoresForKid(currentUser.id);
  const earnings = getWeekEarnings(currentUser.id, 0);
  const dailyChores = chores.filter(c => c.frequency === 'daily');
  const weeklyChores = chores.filter(c => c.frequency === 'weekly');
  const completedToday = dailyChores.filter(c => isChoreCompletedToday(c.id, currentUser.id)).length;
  const progressPct = dailyChores.length > 0 ? (completedToday / dailyChores.length) * 100 : 0;
  const balance = getCurrentBalance ? getCurrentBalance(currentUser.id) : 0;
  const streak = getStreak ? getStreak(currentUser.id) : { current: 0, best: 0 };
  const goals = getGoalsForKid ? getGoalsForKid(currentUser.id) : [];

  return (
    <div className="space-y-6">
      <div className="slide-up">
        <div className="text-sm font-bold text-stone-500 uppercase tracking-wider">{dateStr}</div>
        <h2 className="display-font text-3xl md:text-4xl font-black text-stone-900 mt-1">Let's do this! ✨</h2>
      </div>

      <div className="rounded-3xl p-6 text-white slide-up shadow-xl relative overflow-hidden"
           style={{ background: `linear-gradient(135deg, ${currentUser.color} 0%, ${currentUser.color}DD 100%)`, animationDelay: '0.05s' }}>
        <div className="absolute -right-8 -top-8 text-9xl opacity-10">💰</div>
        <div className="relative">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="text-sm font-black uppercase tracking-widest opacity-80">My Balance</div>
              <div className="display-font text-5xl md:text-6xl font-black mt-1">${balance.toFixed(2)}</div>
              <div className="text-sm font-semibold opacity-90 mt-1">Unpaid earnings</div>
            </div>
            {streak.current > 0 && (
              <div className="bg-white/20 backdrop-blur rounded-2xl px-3 py-2 flex items-center gap-2">
                <Flame size={20} className="text-orange-200" fill="currentColor" />
                <div>
                  <div className="text-2xl font-black leading-none">{streak.current}</div>
                  <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">week streak</div>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 mt-4 text-sm font-semibold opacity-90 flex-wrap pt-3 border-t border-white/20">
            <div>This week: <span className="font-black">${earnings.total.toFixed(2)}</span></div>
            <div className="opacity-60">·</div>
            <div>💼 ${earnings.choreEarnings.toFixed(2)}</div>
            {earnings.extraEarnings > 0 && <div>⭐ ${earnings.extraEarnings.toFixed(2)}</div>}
            {earnings.allDone && <div>🎁 ${currentUser.weeklyAllowance.toFixed(2)}</div>}
          </div>
          {!earnings.allDone && chores.length > 0 && (
            <div className="mt-2 text-xs font-semibold opacity-80">🎯 Finish all your required chores this week for a ${currentUser.weeklyAllowance} bonus!</div>
          )}
        </div>
      </div>

      {goals.length > 0 && (
        <div className="slide-up" style={{ animationDelay: '0.08s' }}>
          <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-3 px-1 flex items-center gap-1">
            <Target size={12} /> My savings goals
          </div>
          <div className="space-y-3">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} balance={balance} color={currentUser.color} />
            ))}
          </div>
        </div>
      )}

      {dailyChores.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-stone-900">Today's chores</div>
            <div className="font-black text-stone-900">{completedToday}/{dailyChores.length}</div>
          </div>
          <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: currentUser.color }} />
          </div>
        </div>
      )}

      {dailyChores.length > 0 && (
        <div className="slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-3 px-1">Every day</div>
          <div className="space-y-3">
            {dailyChores.map(chore => (
              <ChoreCard key={chore.id} chore={chore}
                completed={isChoreCompletedToday(chore.id, currentUser.id)}
                status={getChoreStatusToday(chore.id, currentUser.id)}
                onToggle={() => onToggleChore(chore.id, currentUser.id)} color={currentUser.color} />
            ))}
          </div>
        </div>
      )}

      {weeklyChores.length > 0 && (
        <div className="slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-3 px-1">This week</div>
          <div className="space-y-3">
            {weeklyChores.map(chore => (
              <ChoreCard key={chore.id} chore={chore}
                completed={isChoreCompletedToday(chore.id, currentUser.id)}
                status={getChoreStatusToday(chore.id, currentUser.id)}
                onToggle={() => onToggleChore(chore.id, currentUser.id)} color={currentUser.color} />
            ))}
          </div>
        </div>
      )}

      {chores.length === 0 && extraChores.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center slide-up">
          <div className="text-5xl mb-3">🌟</div>
          <div className="font-bold text-stone-900">No chores yet!</div>
          <div className="text-sm text-stone-500 mt-1">Ask your parent to add some.</div>
        </div>
      )}

      {/* Extra Chores section - visible to every kid, shared across the family */}
      {extraChores.length > 0 && (
        <div className="slide-up" style={{ animationDelay: '0.25s' }}>
          <ExtraChoresSection
            title="Extra Chores"
            subtitle="Finish your required chores first, then claim extras for bonus cash!"
            extrasByCadence={extrasByCadence}
            family={family}
            getExtraClaimsInPeriod={getExtraClaimsInPeriod}
            currentUser={currentUser}
            onToggleChore={onToggleChore}
            isEligibleForExtras={isEligibleForExtras}
            getOutstandingWeeklies={getOutstandingWeeklies}
          />
        </div>
      )}

      {/* "Other" submissions — shows kid all their entries with status */}
      {(() => {
        const allOthers = (family.customCompletions || []).filter(
          c => c.kidId === currentUser.id
        ).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
        if (allOthers.length === 0) return null;
        const pending = allOthers.filter(c => c.status === 'pending');
        const approved = allOthers.filter(c => c.status === 'approved');
        const rejected = allOthers.filter(c => c.status === 'rejected');
        return (
          <div className="slide-up" style={{ animationDelay: '0.28s' }}>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-lg">✨</div>
                <div className="text-xs font-black uppercase tracking-wider text-amber-800">"Other" Submissions</div>
              </div>
              {pending.map(cc => (
                <div key={cc.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="text-2xl">{cc.icon || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 truncate">{cc.title}</div>
                    <div className="text-xs text-stone-500 font-semibold">Submitted {cc.date}</div>
                  </div>
                  <div className="text-xs font-black text-amber-600 bg-amber-100 border border-amber-300 px-2 py-1 rounded-full">⏳ Pending</div>
                </div>
              ))}
              {approved.map(cc => (
                <div key={cc.id} className="bg-emerald-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="text-2xl">{cc.icon || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 truncate">{cc.title}</div>
                    <div className="text-xs text-stone-500 font-semibold">{cc.date}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="font-black text-emerald-600">+${(cc.value || 0).toFixed(2)}</div>
                    <div className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">✓ Approved</div>
                  </div>
                </div>
              ))}
              {rejected.map(cc => (
                <div key={cc.id} className="bg-red-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="text-2xl opacity-40">{cc.icon || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-400 line-through truncate">{cc.title}</div>
                    <div className="text-xs text-stone-400 font-semibold">{cc.date}</div>
                  </div>
                  <div className="text-xs font-black text-red-500 bg-red-100 px-2 py-1 rounded-full">✗ Not approved</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* "Other" button — kid can submit something they did that isn't a listed chore */}
      <div className="slide-up" style={{ animationDelay: '0.3s' }}>
        <button
          onClick={() => setOtherForKidId(currentUser.id)}
          className="w-full bg-white hover:bg-stone-50 border-2 border-dashed border-stone-300 hover:border-amber-300 rounded-3xl p-5 flex items-center justify-center gap-3 transition group"
        >
          <div className="text-3xl">✨</div>
          <div className="text-left">
            <div className="display-font text-lg font-black text-stone-900">Did something else?</div>
            <div className="text-xs font-semibold text-stone-500">Submit to your parent — they'll approve and set the amount</div>
          </div>
          <Plus size={22} className="text-stone-400 group-hover:text-amber-500 ml-auto" strokeWidth={3} />
        </button>
      </div>

      {otherForKidId && (
        <OtherChoreModal
          kid={family.kids.find(k => k.id === otherForKidId)}
          onClose={() => setOtherForKidId(null)}
          onSubmit={async ({ title, icon }) => {
            await onSubmitCustom({ kidId: otherForKidId, title, icon });
            setOtherForKidId(null);
          }}
          isParent={isParent}
        />
      )}
    </div>
  );
}

// ============ EXTRA CHORES SECTION ============
function ExtraChoresSection({ title, subtitle, extrasByCadence, family, getExtraClaimsInPeriod, currentUser, onToggleChore, isEligibleForExtras, getOutstandingWeeklies }) {
  const isParent = currentUser.role === 'parent';
  // For kids: are they eligible? For parents: always "eligible" (they can manage anyone)
  const eligible = isParent ? true : (isEligibleForExtras ? isEligibleForExtras(currentUser.id) : true);
  const outstanding = (!isParent && getOutstandingWeeklies) ? getOutstandingWeeklies(currentUser.id) : [];

  return (
    <div className={`rounded-3xl p-5 shadow-sm border-2 ${eligible ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/50' : 'bg-stone-100 border-stone-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="text-2xl">{eligible ? '⭐' : '🔒'}</div>
        <div className="display-font text-xl font-black text-stone-900">{title}</div>
      </div>
      <div className="text-xs font-semibold text-stone-600 mb-4 ml-9">{subtitle}</div>

      {!eligible && (
        <div className="bg-white rounded-2xl p-4 mb-4 border-2 border-stone-200 flex items-start gap-3">
          <Lock size={20} className="text-stone-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-black text-stone-900 text-sm">Locked for now</div>
            <div className="text-xs text-stone-600 font-semibold mt-1">
              Finish all of your required chores this week to unlock Extra Chores. Staying on top of them last week would have unlocked you automatically!
            </div>
            {outstanding.length > 0 && (
              <>
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-500 mt-3 mb-1">Still need to do:</div>
                <div className="space-y-1">
                  {outstanding.map(chore => (
                    <div key={chore.id} className="flex items-center gap-2 text-xs font-bold text-stone-700">
                      <span className="text-base">{chore.icon}</span>
                      <span>{chore.title}</span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase">· {chore.frequency}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {['daily', 'weekly', 'biweekly', 'monthly'].map(cadence => {
        const list = extrasByCadence[cadence] || [];
        if (list.length === 0) return null;
        const label = CADENCE_LABELS[cadence];
        return (
          <div key={cadence} className="mb-4 last:mb-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-700/70 mb-2 px-1">{label}</div>
            <div className="space-y-2">
              {list.map(chore => {
                const claims = getExtraClaimsInPeriod(chore);
                const myClaim = !isParent ? claims.find(c => c.kidId === currentUser.id) : null;
                return (
                  <ExtraChoreCard
                    key={chore.id}
                    chore={chore}
                    claims={claims}
                    myClaim={myClaim}
                    family={family}
                    currentUser={currentUser}
                    eligible={eligible}
                    onToggle={() => {
                      // Parent taps: toggles the claim they see first (if any), for management
                      // Kid taps: toggles their own claim
                      const targetKidId = isParent
                        ? (claims[0]?.kidId || null)
                        : currentUser.id;
                      onToggleChore(chore.id, targetKidId);
                    }}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExtraChoreCard({ chore, claims = [], myClaim, family, currentUser, onToggle, eligible = true }) {
  const isParent = currentUser.role === 'parent';
  const maxClaimers = chore.maxClaimers || 1;
  const claimCount = claims.length;
  const spotsLeft = Math.max(0, maxClaimers - claimCount);
  const poolFull = spotsLeft === 0;

  const claimedByMe = !!myClaim;
  const isApproved = myClaim?.status === 'approved';
  const isPending = myClaim?.status === 'pending';

  // Interaction rules:
  // - Parents: can always tap (to un-do the first claim, or handle it)
  // - Kids who claimed it: can un-claim their own
  // - Kids eligible and pool not full: can claim
  // - Kids not eligible (locked) or pool full: cannot tap
  const isInteractive = isParent
    ? (claimCount > 0) // parents only get a useful action if there's something to un-claim
    : (claimedByMe || (!poolFull && eligible));

  const isLockedForMe = !isParent && !claimedByMe && (!eligible || poolFull);

  // Visual state keyed off MY claim (for kids) or the overall pool (for parents)
  let bg;
  if (claimedByMe && isApproved) bg = 'bg-emerald-50 border-emerald-200';
  else if (claimedByMe && isPending) bg = 'bg-amber-100 border-amber-300';
  else if (isLockedForMe) bg = 'bg-stone-50 border-stone-200 opacity-60';
  else if (poolFull) bg = 'bg-stone-100 border-stone-200 opacity-75';
  else bg = 'bg-white border-amber-200 hover:border-amber-400 hover:shadow-md';

  const myCompDate = myClaim?.date ? new Date(myClaim.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <button
      onClick={isInteractive ? onToggle : undefined}
      disabled={!isInteractive}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left border ${bg} ${!isInteractive ? 'cursor-default' : ''}`}
    >
      <div className="text-2xl flex-shrink-0">{chore.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-stone-900 ${claimedByMe && isApproved ? 'line-through opacity-60' : ''}`}>{chore.title}</div>
        {chore.description && (
          <div className={`text-xs font-medium text-stone-500 mt-0.5 leading-snug ${claimedByMe && isApproved ? 'opacity-50' : ''}`}>{chore.description}</div>
        )}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <div className="text-xs font-black text-amber-700">${chore.value.toFixed(2)}</div>

          {/* Show each claimer as a small badge */}
          {claims.map(c => {
            const k = family.kids.find(kk => kk.id === c.kidId);
            if (!k) return null;
            const isMe = c.kidId === currentUser.id;
            const statusColor = c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800';
            return (
              <div key={c.completionId} className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                <span>{k.avatar}</span>
                <span>{isMe ? 'You' : k.name}</span>
                {c.status === 'approved' && <Check size={10} strokeWidth={3} />}
              </div>
            );
          })}

          {/* My personal claim status takes precedence */}
          {claimedByMe && isPending && (
            <div className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">Awaiting approval</div>
          )}

          {/* Pool state for kids who aren't claimed yet */}
          {!claimedByMe && !isParent && (
            <>
              {isLockedForMe && !poolFull && eligible === false && (
                <div className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Lock size={9} /> LOCKED</div>
              )}
              {!isLockedForMe && poolFull && (
                <div className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-full">Fully claimed</div>
              )}
              {!isLockedForMe && !poolFull && (
                <div className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {maxClaimers === 1 ? 'Up for grabs' : `Up for grabs · ${spotsLeft} of ${maxClaimers} left`}
                </div>
              )}
            </>
          )}

          {/* Parent view: show pool stats */}
          {isParent && maxClaimers > 1 && (
            <div className="text-[10px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
              {claimCount}/{maxClaimers} claimed
            </div>
          )}
        </div>
      </div>
      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        claimedByMe ? 'border-transparent' : isLockedForMe ? 'border-stone-300' : 'border-amber-400'
      }`} style={{
        background: (claimedByMe && isApproved) ? '#10B981'
                  : (claimedByMe && isPending) ? '#F59E0B'
                  : poolFull ? '#D6D3D1'
                  : 'transparent'
      }}>
        {claimedByMe && <Check size={18} className="text-white" strokeWidth={3} />}
        {isLockedForMe && !claimedByMe && <Lock size={14} className="text-stone-400" />}
      </div>
    </button>
  );
}

function KidDashboardCard({ kid, chores, completedToday, totalToday, weekTotal, balance, streak, goals, reload, onToggleChore, isChoreCompletedToday, getChoreStatusToday }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const progressPct = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;
  return (
    <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: kid.color + '20' }}>{kid.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-black text-lg text-stone-900">{kid.name}</div>
              {streak && streak.current > 0 && (
                <div className="flex items-center gap-1 text-xs font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                  <Flame size={11} fill="currentColor" /> {streak.current}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <div className="text-sm font-semibold text-stone-600">{completedToday}/{totalToday} today</div>
              <div className="w-1 h-1 rounded-full bg-stone-300" />
              <div className="text-sm font-black text-emerald-600">${weekTotal.toFixed(2)} this week</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-emerald-50 rounded-2xl p-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <Wallet size={11} /> Balance
            </div>
            <div className="display-font text-xl font-black text-stone-900 mt-0.5">${(balance || 0).toFixed(2)}</div>
          </div>
          <button onClick={() => setShowPayout(true)}
                  disabled={!balance || balance <= 0}
                  className="bg-amber-400 hover:bg-amber-500 disabled:bg-stone-100 disabled:text-stone-400 text-stone-900 rounded-2xl p-3 flex items-center justify-center gap-2 font-black text-sm transition shadow-sm disabled:shadow-none">
            <DollarSign size={16} strokeWidth={3} /> Pay out
          </button>
        </div>

        {totalToday > 0 && (
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: kid.color }} />
          </div>
        )}

        {goals && goals.length > 0 && (
          <div className="mt-3 space-y-2">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} balance={balance} color={kid.color} compact />
            ))}
          </div>
        )}

        <button onClick={() => setExpanded(!expanded)}
                className="w-full mt-3 py-2 text-xs font-black text-stone-500 hover:text-stone-900 transition flex items-center justify-center gap-1">
          {expanded ? 'Hide' : 'Show'} chores
          <span>{expanded ? '−' : '+'}</span>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-stone-100 p-4 bg-stone-50/50 space-y-2">
          {chores.length === 0 ? (
            <div className="text-sm text-stone-500 text-center py-4">No chores assigned</div>
          ) : (
            chores.map(chore => (
              <ChoreCard key={chore.id} chore={chore}
                completed={isChoreCompletedToday(chore.id)}
                status={getChoreStatusToday(chore.id)}
                onToggle={() => onToggleChore(chore.id)} color={kid.color} />
            ))
          )}
        </div>
      )}

      {showPayout && (
        <PayoutModal kid={kid} currentBalance={balance}
                     onClose={() => setShowPayout(false)}
                     onConfirm={async (amount, note) => {
                       await api.addPayout({ kidId: kid.id, amount, note, date: new Date().toISOString().split('T')[0] });
                       setShowPayout(false);
                       if (reload) reload();
                     }} />
      )}
    </div>
  );
}

function GoalCard({ goal, balance, color, compact }) {
  const pct = goal.target > 0 ? Math.min(100, (balance / goal.target) * 100) : 0;
  const reached = balance >= goal.target;
  if (compact) {
    return (
      <div className={`rounded-xl p-2 ${reached ? 'bg-emerald-50' : 'bg-stone-50'}`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="text-lg">{goal.icon}</div>
          <div className="flex-1 text-xs font-bold text-stone-900 truncate">{goal.title}</div>
          <div className="text-xs font-black text-stone-700">${balance.toFixed(0)}/${goal.target.toFixed(0)}</div>
        </div>
        <div className="h-1.5 bg-white rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: reached ? '#10B981' : color }} />
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-3xl p-5 shadow-sm ${reached ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200' : 'bg-white'}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: (reached ? '#10B98120' : color + '20') }}>{goal.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-stone-900">{goal.title}</div>
          <div className="text-xs font-bold text-stone-500">${balance.toFixed(2)} of ${goal.target.toFixed(2)}</div>
        </div>
        {reached && (
          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-full text-xs font-black">
            <Trophy size={12} /> Reached!
          </div>
        )}
      </div>
      <div className="h-3 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: reached ? '#10B981' : color }} />
      </div>
      <div className="text-xs font-bold text-stone-500 mt-2 text-right">{pct.toFixed(0)}% there</div>
    </div>
  );
}

function ChoreCard({ chore, completed, status, onToggle, color }) {
  const isPending = status === 'pending';
  const isApproved = status === 'approved';
  return (
    <button onClick={onToggle}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${
        isApproved ? 'bg-emerald-50' : isPending ? 'bg-amber-50' : 'bg-white hover:bg-stone-50 shadow-sm'
      }`}>
      <div className="text-3xl flex-shrink-0">{chore.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-stone-900 flex items-center gap-2 flex-wrap ${isApproved ? 'line-through opacity-60' : ''}`}>
          {chore.title}
          {chore.isRequiredForExtras && !isApproved && (
            <span className="text-[9px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
              <Lock size={8} /> REQUIRED
            </span>
          )}
        </div>
        {chore.description && (
          <div className={`text-xs font-medium text-stone-500 mt-0.5 leading-snug ${isApproved ? 'opacity-50' : ''}`}>{chore.description}</div>
        )}
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <div className="text-sm font-black" style={{ color: isApproved ? '#059669' : color }}>${chore.value.toFixed(2)}</div>
          {isPending && <div className="text-xs font-bold text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">Awaiting approval</div>}
          {isApproved && <div className="text-xs font-bold text-emerald-700 bg-emerald-200 px-2 py-0.5 rounded-full">Approved ✓</div>}
        </div>
      </div>
      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${completed ? 'border-transparent' : 'border-stone-300'}`}
           style={{ background: completed ? (isApproved ? '#10B981' : '#F59E0B') : 'transparent' }}>
        {completed && <Check size={22} className="text-white check-pop" strokeWidth={3} />}
      </div>
    </button>
  );
}

// ============ APPROVALS ============
function Approvals({ family, pending, pendingCustom = [], onApprove, onReject, onApproveCustom, onRejectCustom }) {
  const total = pending.length + pendingCustom.length;
  return (
    <div className="space-y-6">
      <div className="slide-up">
        <h2 className="display-font text-3xl md:text-4xl font-black text-stone-900">Needs Approval</h2>
        <p className="text-stone-700 font-bold mt-1">
          {total === 0 ? 'All caught up!' : `${total} ${total === 1 ? 'item' : 'items'} waiting for you`}
        </p>
      </div>
      {total === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center slide-up shadow-sm">
          <div className="text-6xl mb-3">🎉</div>
          <div className="font-black text-xl text-stone-900">Nothing to approve</div>
          <div className="text-sm text-stone-700 font-semibold mt-1">Come back later when the kids check off chores.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((comp, i) => {
            const chore = family.chores.find(c => c.id === comp.choreId);
            const kid = family.kids.find(k => k.id === comp.kidId);
            if (!chore || !kid) return null;
            return (
              <div key={comp.id} className="bg-white rounded-3xl p-5 shadow-md slide-up border border-stone-200" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ring-2 ring-stone-200" style={{ background: kid.color + '30' }}>{kid.avatar}</div>
                  <div className="flex-1">
                    <div className="font-black text-stone-900 text-lg">{kid.name}</div>
                    <div className="text-sm text-stone-700 font-semibold">completed a chore</div>
                  </div>
                  <div className="text-3xl">{chore.icon}</div>
                </div>
                <div className="bg-stone-100 rounded-2xl p-4 mb-4 border border-stone-200">
                  <div className="font-black text-stone-900 text-base">{chore.title}</div>
                  {chore.description && (
                    <div className="text-xs font-semibold text-stone-700 mt-1 leading-snug">{chore.description}</div>
                  )}
                  <div className="text-base font-black text-emerald-700 mt-1">${chore.value.toFixed(2)}</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => onReject(comp.id)} className="flex-1 py-3 rounded-2xl font-black bg-stone-200 hover:bg-red-100 text-stone-800 hover:text-red-700 transition flex items-center justify-center gap-2">
                    <X size={20} strokeWidth={3} /> Reject
                  </button>
                  <button onClick={() => onApprove(comp.id)} className="flex-1 py-3 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200">
                    <Check size={20} strokeWidth={3} /> Approve
                  </button>
                </div>
              </div>
            );
          })}
          {pendingCustom.map((cc, i) => {
            const kid = family.kids.find(k => k.id === cc.kidId);
            if (!kid) return null;
            return (
              <CustomApprovalCard
                key={cc.id}
                custom={cc}
                kid={kid}
                animationDelay={(pending.length + i) * 0.05}
                onApprove={(value) => onApproveCustom(cc.id, value)}
                onReject={() => onRejectCustom(cc.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomApprovalCard({ custom, kid, animationDelay, onApprove, onReject }) {
  const [value, setValue] = useState('');
  const numeric = parseFloat(value);
  const canApprove = !isNaN(numeric) && numeric >= 0;
  const QUICK_PICKS = [1, 2, 5];

  return (
    <div className="bg-white rounded-3xl p-5 shadow-md slide-up border-2 border-amber-300" style={{ animationDelay: `${animationDelay}s` }}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ring-2 ring-stone-200" style={{ background: kid.color + '30' }}>{kid.avatar}</div>
        <div className="flex-1">
          <div className="font-black text-stone-900 text-lg">{kid.name}</div>
          <div className="text-xs font-black text-amber-800 uppercase tracking-wider">"Other" entry</div>
        </div>
        <div className="text-3xl">{custom.icon || '✨'}</div>
      </div>
      <div className="bg-amber-100 border-2 border-amber-300 rounded-2xl p-4 mb-4">
        <div className="font-black text-stone-900 text-base">{custom.title}</div>
        <div className="text-xs font-bold text-stone-700 mt-1">Submitted {custom.date}</div>
      </div>

      <div className="mb-3">
        <label className="text-xs font-black uppercase tracking-wider text-stone-700 mb-2 block">How much is it worth?</label>
        <div className="flex gap-2 mb-2">
          {QUICK_PICKS.map(amt => (
            <button key={amt} onClick={() => setValue(String(amt.toFixed(2)))}
              className={`flex-1 py-2.5 rounded-xl font-black text-base transition ${value === amt.toFixed(2) ? 'bg-amber-400 text-stone-900 ring-2 ring-amber-600' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'}`}>
              ${amt}
            </button>
          ))}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-700 font-black">$</span>
          <input
            type="number" min="0" step="0.25" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Custom amount"
            className="w-full pl-7 pr-4 py-3 rounded-2xl bg-stone-100 border-2 border-stone-200 outline-none focus:ring-4 focus:ring-amber-300 focus:border-amber-400 text-stone-900 font-bold placeholder:text-stone-500"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onReject} className="flex-1 py-3 rounded-2xl font-black bg-stone-200 hover:bg-red-100 text-stone-800 hover:text-red-700 transition flex items-center justify-center gap-2">
          <X size={20} strokeWidth={3} /> Reject
        </button>
        <button onClick={() => canApprove && onApprove(numeric)} disabled={!canApprove}
          className="flex-1 py-3 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-200 disabled:shadow-none">
          <Check size={20} strokeWidth={3} /> Approve
        </button>
      </div>
    </div>
  );
}


// ============ HISTORY ============
function HistoryView({ currentUser, family, getWeekEarnings, reload }) {
  const isParent = currentUser.role === 'parent';
  const kidsToShow = isParent ? family.kids : family.kids.filter(k => k.id === currentUser.id);
  const [selectedKidId, setSelectedKidId] = useState(kidsToShow[0]?.id);
  const [weekOffset, setWeekOffset] = useState(1);

  useEffect(() => {
    if (!kidsToShow.find(k => k.id === selectedKidId)) setSelectedKidId(kidsToShow[0]?.id);
  }, [kidsToShow, selectedKidId]);

  const selectedKid = family.kids.find(k => k.id === selectedKidId);
  if (!selectedKid) {
    return (
      <div className="space-y-6">
        <h2 className="display-font text-3xl font-black text-stone-900">History</h2>
        <div className="bg-white rounded-3xl p-12 text-center">
          <div className="text-5xl mb-3">🤷</div>
          <div className="font-bold text-stone-900">No one to show</div>
        </div>
      </div>
    );
  }

  const weekData = getWeekEarnings(selectedKid.id, weekOffset);
  const weeks = [3, 2, 1, 0].map(offset => getWeekEarnings(selectedKid.id, offset));
  const maxEarn = Math.max(...weeks.map(w => w.total), 1);

  // Custom "Other" completions for this kid in the selected week window
  const today = new Date(todayStr());
  const dayOfWeek = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek - (weekOffset * 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  const weekCustoms = (family.customCompletions || []).filter(c =>
    c.kidId === selectedKid.id && c.date >= weekStartStr && c.date <= weekEndStr
  );

  return (
    <div className="space-y-6">
      <div className="slide-up">
        <h2 className="display-font text-3xl md:text-4xl font-black text-stone-900">History</h2>
        <p className="text-stone-500 font-semibold mt-1">Past chores and allowance</p>
      </div>

      {isParent && kidsToShow.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 slide-up">
          {kidsToShow.map(kid => (
            <button key={kid.id} onClick={() => setSelectedKidId(kid.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition flex-shrink-0 ${selectedKidId === kid.id ? 'text-white shadow-lg' : 'bg-white text-stone-700 hover:bg-stone-100'}`}
              style={{ background: selectedKidId === kid.id ? kid.color : undefined }}>
              <span className="text-xl">{kid.avatar}</span>{kid.name}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-sm slide-up">
        <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">Last 4 weeks</div>
        <div className="flex items-end justify-between gap-3 h-40">
          {weeks.map((w, i) => {
            const offset = 3 - i;
            const isSelected = offset === weekOffset;
            const heightPct = maxEarn > 0 ? (w.total / maxEarn) * 100 : 0;
            return (
              <button key={offset} onClick={() => setWeekOffset(offset)} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="text-xs font-black text-stone-700">${w.total.toFixed(0)}</div>
                <div className="w-full bg-stone-100 rounded-t-xl flex-1 flex items-end overflow-hidden">
                  <div className="w-full rounded-t-xl transition-all duration-500"
                    style={{ height: `${heightPct}%`, background: isSelected ? selectedKid.color : selectedKid.color + '60', minHeight: w.total > 0 ? '8px' : '0' }} />
                </div>
                <div className={`text-xs font-bold ${isSelected ? 'text-stone-900' : 'text-stone-400'}`}>{offset === 0 ? 'This' : offset === 1 ? 'Last' : `-${offset}w`}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm slide-up">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-stone-500">{weekData.weekLabel}</div>
            <div className="display-font text-3xl font-black text-stone-900 mt-1">${weekData.total.toFixed(2)}</div>
          </div>
          {weekData.allDone && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-black">
              <Trophy size={16} /> Perfect week!
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-stone-50 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-stone-500 uppercase">Chores</div>
            <div className="display-font text-xl font-black text-stone-900 mt-1">${weekData.choreEarnings.toFixed(2)}</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-amber-700 uppercase">Extras</div>
            <div className="display-font text-xl font-black text-stone-900 mt-1">${(weekData.extraEarnings || 0).toFixed(2)}</div>
          </div>
          <div className="bg-stone-50 rounded-2xl p-3">
            <div className="text-[10px] font-bold text-stone-500 uppercase">Bonus</div>
            <div className="display-font text-xl font-black mt-1" style={{ color: weekData.bonus > 0 ? '#059669' : '#A8A29E' }}>${weekData.bonus.toFixed(2)}</div>
          </div>
        </div>

        <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-3">Chores Completed</div>
        {weekData.completions.length === 0 ? (
          <div className="text-center py-6 text-stone-400 font-semibold">No chores completed this week</div>
        ) : (
          <div className="space-y-2">
            {weekData.completions.map(comp => {
              const chore = family.chores.find(c => c.id === comp.choreId);
              if (!chore) return null;
              const isExtra = chore.assignedTo === null || chore.assignedTo === undefined;
              const compDate = new Date(comp.date);
              return (
                <div key={comp.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isExtra ? 'bg-amber-50' : 'bg-stone-50'}`}>
                  <div className="text-2xl">{chore.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                      {chore.title}
                      {isExtra && <span className="text-[10px] font-black text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full flex items-center gap-0.5"><Sparkles size={9} /> EXTRA</span>}
                    </div>
                    <div className="text-xs text-stone-500 font-semibold">
                      {compDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="font-black text-emerald-600">+${chore.value.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}

        {weekCustoms.length > 0 && (
          <>
            <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-3 mt-5">"Other" Entries</div>
            <div className="space-y-2">
              {weekCustoms.map(cc => {
                const compDate = new Date(cc.date);
                const isApproved = cc.status === 'approved';
                const isRejected = cc.status === 'rejected';
                const isPending = cc.status === 'pending';
                return (
                  <div key={cc.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isApproved ? 'bg-amber-50' : isRejected ? 'bg-red-50' : 'bg-stone-50'}`}>
                    <div className={`text-2xl ${isRejected ? 'opacity-40' : ''}`}>{cc.icon || '✨'}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold flex items-center gap-2 flex-wrap ${isRejected ? 'text-stone-400 line-through' : 'text-stone-900'}`}>
                        {cc.title}
                        {isApproved && <span className="text-[10px] font-black text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full no-underline" style={{ textDecoration: 'none' }}>OTHER</span>}
                        {isPending && <span className="text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full" style={{ textDecoration: 'none' }}>PENDING</span>}
                        {isRejected && <span className="text-[10px] font-black text-red-500 bg-red-100 px-2 py-0.5 rounded-full" style={{ textDecoration: 'none' }}>REJECTED</span>}
                      </div>
                      <div className="text-xs text-stone-500 font-semibold">
                        {compDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isApproved && <div className="font-black text-emerald-600">+${(cc.value || 0).toFixed(2)}</div>}
                      {isPending && <div className="text-xs font-bold text-stone-400">$—</div>}
                      {isRejected && <div className="text-xs font-bold text-red-400">$0</div>}
                      {isApproved && isParent && (
                        <PromoteButton cc={cc} kid={selectedKid} family={family} reload={reload} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============ MANAGE ============
function Manage({ family, reload, currentUser }) {
  const [showAddChore, setShowAddChore] = useState(false);
  const [showAddKid, setShowAddKid] = useState(false);
  const [showAddParent, setShowAddParent] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  const [editingKid, setEditingKid] = useState(null);
  const [editingChore, setEditingChore] = useState(null);
  const [addingGoalFor, setAddingGoalFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const doDelete = async () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'kid') await api.removeKid(confirmDelete.id);
    if (confirmDelete.type === 'chore') await api.removeChore(confirmDelete.id);
    if (confirmDelete.type === 'parent') await api.removeParent(confirmDelete.id);
    if (confirmDelete.type === 'goal') await api.removeGoal(confirmDelete.id);
    if (confirmDelete.type === 'payout') await api.removePayout(confirmDelete.id);
    setConfirmDelete(null);
    reload();
  };

  return (
    <div className="space-y-6">
      <div className="slide-up">
        <h2 className="display-font text-3xl md:text-4xl font-black text-stone-900">Manage</h2>
        <p className="text-stone-500 font-semibold mt-1">Family, chores, and settings</p>
      </div>

      {/* Parents */}
      <div className="bg-white rounded-3xl p-5 shadow-sm slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-black uppercase tracking-widest text-stone-500">Parents</div>
          <button onClick={() => setShowAddParent(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-sm transition">
            <Plus size={16} strokeWidth={3} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {family.parents.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: (p.color || '#F59E0B') + '20' }}>{p.avatar}</div>
              <div className="flex-1">
                <div className="font-black text-stone-900">{p.name}</div>
                <div className="text-xs text-stone-500 font-semibold">
                  {p.id === currentUser.id ? 'Signed in' : 'Parent'}
                </div>
              </div>
              <button onClick={() => setEditingParent(p)}
                      className="w-10 h-10 rounded-xl hover:bg-amber-100 text-stone-500 hover:text-amber-700 flex items-center justify-center transition"
                      aria-label={`Edit ${p.name}`}>
                <Pencil size={17} />
              </button>
              {p.id === currentUser.id && (
                <button onClick={() => setShowChangePin(true)} className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-black transition">
                  Change PIN
                </button>
              )}
              {family.parents.length > 1 && p.id !== currentUser.id && (
                <button onClick={() => setConfirmDelete({ type: 'parent', id: p.id, name: p.name })}
                        className="w-10 h-10 rounded-xl hover:bg-red-50 text-stone-400 hover:text-red-600 flex items-center justify-center transition">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Kids */}
      <div className="bg-white rounded-3xl p-5 shadow-sm slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-black uppercase tracking-widest text-stone-500">Kids</div>
          <button onClick={() => setShowAddKid(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-sm transition">
            <Plus size={16} strokeWidth={3} /> Add
          </button>
        </div>
        <div className="space-y-2">
          {family.kids.length === 0 && <div className="text-center py-6 text-stone-400 font-semibold">No kids yet</div>}
          {family.kids.map(kid => (
            <div key={kid.id} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: kid.color + '20' }}>{kid.avatar}</div>
              <div className="flex-1">
                <div className="font-black text-stone-900">{kid.name}</div>
                <div className="text-xs text-stone-500 font-semibold">Age {kid.age} · ${kid.weeklyAllowance}/week bonus</div>
              </div>
              <button onClick={() => setEditingKid(kid)}
                      className="w-10 h-10 rounded-xl hover:bg-amber-100 text-stone-500 hover:text-amber-700 flex items-center justify-center transition"
                      aria-label={`Edit ${kid.name}`}>
                <Pencil size={17} />
              </button>
              <button onClick={() => setConfirmDelete({ type: 'kid', id: kid.id, name: kid.name })}
                      className="w-10 h-10 rounded-xl hover:bg-red-50 text-stone-400 hover:text-red-600 flex items-center justify-center transition"
                      aria-label={`Remove ${kid.name}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chores */}
      <div className="bg-white rounded-3xl p-5 shadow-sm slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-black uppercase tracking-widest text-stone-500">Chores</div>
          <button onClick={() => setShowAddChore(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-sm transition">
            <Plus size={16} strokeWidth={3} /> Add
          </button>
        </div>
        <div className="space-y-3">
          {family.chores.length === 0 && <div className="text-center py-6 text-stone-400 font-semibold">No chores yet</div>}
          {family.kids.map(kid => {
            const kidChores = family.chores.filter(c => c.assignedTo === kid.id);
            if (kidChores.length === 0) return null;
            return (
              <div key={kid.id}>
                <div className="text-xs font-bold text-stone-500 px-2 mb-1 flex items-center gap-1">
                  <span>{kid.avatar}</span> {kid.name}'s chores
                </div>
                <div className="space-y-1.5">
                  {kidChores.map(chore => (
                    <div key={chore.id} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50">
                      <div className="text-2xl">{chore.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-stone-900 flex items-center gap-2 flex-wrap">
                          {chore.title}
                          {chore.isRequiredForExtras && (
                            <span className="text-[9px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded-full flex items-center gap-0.5 whitespace-nowrap">
                              <Lock size={8} /> REQUIRED
                            </span>
                          )}
                        </div>
                        {chore.description && (
                          <div className="text-xs font-medium text-stone-500 mt-0.5 leading-snug">{chore.description}</div>
                        )}
                        <div className="text-xs text-stone-500 font-semibold">${chore.value.toFixed(2)} · {chore.frequency}</div>
                      </div>
                      <button onClick={() => setEditingChore(chore)}
                              className="w-10 h-10 rounded-xl hover:bg-amber-100 text-stone-500 hover:text-amber-700 flex items-center justify-center transition">
                        <Pencil size={17} />
                      </button>
                      <button onClick={() => setConfirmDelete({ type: 'chore', id: chore.id, name: chore.title })}
                              className="w-10 h-10 rounded-xl hover:bg-red-50 text-stone-400 hover:text-red-600 flex items-center justify-center transition">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Extra (shared) Chores */}
          {family.chores.filter(c => c.assignedTo === null || c.assignedTo === undefined).length > 0 && (
            <div>
              <div className="text-xs font-bold text-amber-700 px-2 mb-1 flex items-center gap-1">
                <Sparkles size={14} /> Extra Chores (shared)
              </div>
              <div className="space-y-1.5">
                {family.chores.filter(c => c.assignedTo === null || c.assignedTo === undefined).map(chore => (
                  <div key={chore.id} className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <div className="text-2xl">{chore.icon}</div>
                    <div className="flex-1">
                      <div className="font-bold text-stone-900">{chore.title}</div>
                      {chore.description && (
                        <div className="text-xs font-medium text-stone-500 mt-0.5 leading-snug">{chore.description}</div>
                      )}
                      <div className="text-xs text-stone-500 font-semibold">${chore.value.toFixed(2)} · {chore.frequency} · {(chore.maxClaimers || 1) === 1 ? 'one kid claims' : `up to ${chore.maxClaimers} kids`}</div>
                    </div>
                    <button onClick={() => setEditingChore(chore)}
                            className="w-10 h-10 rounded-xl hover:bg-amber-200 text-stone-500 hover:text-amber-800 flex items-center justify-center transition">
                      <Pencil size={17} />
                    </button>
                    <button onClick={() => setConfirmDelete({ type: 'chore', id: chore.id, name: chore.title })}
                            className="w-10 h-10 rounded-xl hover:bg-red-50 text-stone-400 hover:text-red-600 flex items-center justify-center transition">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Savings Goals */}
      <div className="bg-white rounded-3xl p-5 shadow-sm slide-up">
        <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4 flex items-center gap-1">
          <Target size={12} /> Savings Goals
        </div>
        {family.kids.length === 0 ? (
          <div className="text-center py-6 text-stone-400 font-semibold">Add a kid first</div>
        ) : (
          <div className="space-y-4">
            {family.kids.map(kid => {
              const kidGoals = (family.goals || []).filter(g => g.kidId === kid.id);
              return (
                <div key={kid.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-stone-500 flex items-center gap-1 px-1">
                      <span>{kid.avatar}</span> {kid.name}'s goals
                    </div>
                    <button onClick={() => setAddingGoalFor(kid)}
                            className="flex items-center gap-1 px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-black text-xs transition">
                      <Plus size={12} strokeWidth={3} /> Add
                    </button>
                  </div>
                  {kidGoals.length === 0 ? (
                    <div className="text-xs text-stone-400 font-semibold px-2 py-2">No goals yet</div>
                  ) : (
                    <div className="space-y-1.5">
                      {kidGoals.map(goal => (
                        <div key={goal.id} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50">
                          <div className="text-2xl">{goal.icon}</div>
                          <div className="flex-1">
                            <div className="font-bold text-stone-900">{goal.title}</div>
                            <div className="text-xs text-stone-500 font-semibold">Target: ${goal.target.toFixed(2)}</div>
                          </div>
                          <button onClick={() => setConfirmDelete({ type: 'goal', id: goal.id, name: goal.title })}
                                  className="w-10 h-10 rounded-xl hover:bg-red-50 text-stone-400 hover:text-red-600 flex items-center justify-center transition">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payout History */}
      {(family.payouts || []).length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-sm slide-up">
          <div className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4 flex items-center gap-1">
            <DollarSign size={12} /> Recent Payouts
          </div>
          <div className="space-y-2">
            {(family.payouts || []).slice(0, 10).map(payout => {
              const kid = family.kids.find(k => k.id === payout.kidId);
              if (!kid) return null;
              const d = new Date(payout.date);
              return (
                <div key={payout.id} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: kid.color + '20' }}>{kid.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-900">{kid.name}</div>
                    <div className="text-xs text-stone-500 font-semibold">
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {payout.note && <span> · {payout.note}</span>}
                    </div>
                  </div>
                  <div className="font-black text-emerald-600">${payout.amount.toFixed(2)}</div>
                  <button onClick={() => setConfirmDelete({ type: 'payout', id: payout.id, name: `$${payout.amount.toFixed(2)} payout to ${kid.name}` })}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 text-stone-300 hover:text-red-600 flex items-center justify-center transition">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showAddChore && <AddChoreModal kids={family.kids} onAdd={async (d) => {
        const { assignedToIds, isExtra, ...rest } = d;
        if (isExtra) {
          await api.addChore({ ...rest, assignedTo: null });
        } else {
          await Promise.all((assignedToIds || []).map(kidId =>
            api.addChore({ ...rest, assignedTo: kidId })
          ));
        }
        setShowAddChore(false);
        reload();
      }} onClose={() => setShowAddChore(false)} />}
      {showAddKid && <AddKidModal onAdd={async (d) => { await api.addKid(d); setShowAddKid(false); reload(); }} onClose={() => setShowAddKid(false)} />}
      {editingKid && <EditKidModal kid={editingKid}
                                   onSave={async (d) => { await api.updateKid(editingKid.id, d); setEditingKid(null); reload(); }}
                                   onClose={() => setEditingKid(null)} />}
      {editingChore && <EditChoreModal chore={editingChore} kids={family.kids}
                                       onSave={async (d) => { await api.updateChore(editingChore.id, d); setEditingChore(null); reload(); }}
                                       onClose={() => setEditingChore(null)} />}
      {addingGoalFor && <AddGoalModal kid={addingGoalFor}
                                      onAdd={async (d) => { await api.addGoal(d); setAddingGoalFor(null); reload(); }}
                                      onClose={() => setAddingGoalFor(null)} />}
      {showAddParent && <AddParentModal onAdd={async (d) => { await api.addParent(d); setShowAddParent(false); reload(); }} onClose={() => setShowAddParent(false)} />}
      {editingParent && <EditParentModal parent={editingParent} onSave={async (d) => { await api.updateParent(editingParent.id, d); setEditingParent(null); reload(); }} onClose={() => setEditingParent(null)} />}
      {showChangePin && <ChangePinModal parent={currentUser} onClose={() => setShowChangePin(false)} />}
      {confirmDelete && <ConfirmDeleteModal item={confirmDelete} onConfirm={doDelete} onCancel={() => setConfirmDelete(null)} />}
    </div>
  );
}

// ============ MODALS ============
function ModalShell({ children, onClose, title }) {
  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto pop-in"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="display-font text-2xl font-black text-stone-900">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-stone-100 flex items-center justify-center transition"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddChoreModal({ kids, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('1.00');
  const [icon, setIcon] = useState('🧹');
  const [mode, setMode] = useState('assigned'); // 'assigned' or 'extra'
  const [assignedToIds, setAssignedToIds] = useState(kids.length === 1 ? [kids[0].id] : []);
  const [frequency, setFrequency] = useState('daily');
  const [isRequiredForExtras, setIsRequiredForExtras] = useState(false);
  const [maxClaimers, setMaxClaimers] = useState(1);

  const toggleKid = (kidId) => {
    setAssignedToIds(prev =>
      prev.includes(kidId) ? prev.filter(id => id !== kidId) : [...prev, kidId]
    );
  };
  const selectAll = () => setAssignedToIds(kids.map(k => k.id));
  const clearAll = () => setAssignedToIds([]);

  const canSubmit = title.trim() && !isNaN(parseFloat(value)) &&
                    (mode === 'extra' || assignedToIds.length > 0);
  const allSelected = assignedToIds.length === kids.length && kids.length > 0;

  return (
    <ModalShell onClose={onClose} title="New chore">
      <div className="space-y-4">
        {/* Mode toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
          <button type="button" onClick={() => setMode('assigned')}
                  className={`py-2.5 rounded-xl text-sm font-black transition ${mode === 'assigned' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
            Assigned
          </button>
          <button type="button" onClick={() => setMode('extra')}
                  className={`py-2.5 rounded-xl text-sm font-black transition flex items-center justify-center gap-1 ${mode === 'extra' ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500'}`}>
            <Sparkles size={14} /> Extra Chore
          </button>
        </div>
        <div className="text-xs font-semibold text-stone-500 -mt-2 px-1">
          {mode === 'assigned'
            ? 'Goes to specific kids. Each gets their own copy.'
            : 'Shared across all kids — whoever does it first earns the money.'}
        </div>

        <Field label="Name">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Feed the cat" autoFocus
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Description (optional)">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120}
                 placeholder="e.g., Fill bowl with 1 scoop of food and fresh water"
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold text-sm outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Icon">
          <div className="grid grid-cols-7 gap-2 max-h-52 overflow-y-auto p-2 bg-stone-50 rounded-2xl">
            {DEDUPED_EMOJI_OPTIONS.map(e => (
              <button key={e} type="button" onClick={() => setIcon(e)}
                      className={`text-2xl p-2 rounded-xl transition ${icon === e ? 'bg-amber-200 scale-110' : 'hover:bg-stone-200'}`}>{e}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value ($)">
            <input type="number" step="0.25" min="0" value={value} onChange={(e) => setValue(e.target.value)}
                   className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
          <Field label={mode === 'extra' ? 'Resets' : 'How often'}>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300">
              {CADENCE_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {mode === 'assigned' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-widest text-stone-500">
                Assign to {assignedToIds.length > 0 && <span className="text-amber-600">({assignedToIds.length})</span>}
              </label>
              {kids.length > 1 && (
                <button type="button" onClick={allSelected ? clearAll : selectAll}
                        className="text-xs font-black text-amber-600 hover:text-amber-700 transition">
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            {kids.length === 0 ? (
              <div className="text-sm text-stone-500 p-4 bg-stone-50 rounded-2xl text-center">
                Add a kid first, or switch to Extra Chore above.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {kids.map(kid => {
                  const selected = assignedToIds.includes(kid.id);
                  return (
                    <button key={kid.id} type="button" onClick={() => toggleKid(kid.id)}
                            className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl font-bold transition border-2 ${selected ? 'bg-white shadow-md' : 'bg-stone-100 hover:bg-stone-200 border-transparent opacity-60'}`}
                            style={{ borderColor: selected ? kid.color : 'transparent' }}>
                      {selected && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                             style={{ background: kid.color }}>
                          <Check size={14} className="text-white" strokeWidth={3} />
                        </div>
                      )}
                      <div className="text-2xl">{kid.avatar}</div>
                      <div className="text-sm">{kid.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
            {kids.length > 1 && assignedToIds.length > 0 && (
              <div className="text-xs text-stone-500 font-semibold mt-2 px-1">
                {assignedToIds.length === 1 ? 'A chore will be added for this kid' :
                 `A separate copy will be added for each of the ${assignedToIds.length} selected kids`}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex gap-3">
            <Sparkles size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-stone-700">
              This chore will appear on every kid's dashboard. The first {maxClaimers > 1 ? `${maxClaimers} kids` : 'kid'} to check it off {maxClaimers > 1 ? 'claim' : 'claims'} the earnings, and it won't show up {maxClaimers > 1 ? 'for them' : ''} again until it resets.
            </div>
          </div>
        )}

        {mode === 'extra' && (
          <Field label="How many kids can claim this?">
            <div className="flex items-center gap-3 bg-stone-50 rounded-2xl p-3 border-2 border-stone-200">
              <button type="button"
                      onClick={() => setMaxClaimers(Math.max(1, maxClaimers - 1))}
                      disabled={maxClaimers <= 1}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm font-black text-lg disabled:opacity-40 hover:bg-stone-100 transition">−</button>
              <div className="flex-1 text-center">
                <div className="display-font text-2xl font-black text-stone-900">{maxClaimers}</div>
                <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  {maxClaimers === 1 ? 'one kid · first wins' : `up to ${maxClaimers} kids can claim`}
                </div>
              </div>
              <button type="button"
                      onClick={() => setMaxClaimers(Math.min(Math.max(1, kids.length), maxClaimers + 1))}
                      disabled={maxClaimers >= Math.max(1, kids.length)}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm font-black text-lg disabled:opacity-40 hover:bg-stone-100 transition">+</button>
            </div>
            <div className="text-[11px] text-stone-500 font-semibold mt-2 px-1">
              Example: "Unload dishwasher" = 1 kid, "Pull weeds" = 3 kids.
            </div>
          </Field>
        )}

        {mode === 'assigned' && (
          <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${isRequiredForExtras ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}>
            <input type="checkbox" checked={isRequiredForExtras}
                   onChange={(e) => setIsRequiredForExtras(e.target.checked)}
                   className="mt-0.5 w-5 h-5 rounded accent-amber-500 cursor-pointer flex-shrink-0" />
            <div className="flex-1">
              <div className="font-black text-sm text-stone-900 flex items-center gap-1">
                <Lock size={12} /> Required for Extra Chores
              </div>
              <div className="text-xs font-semibold text-stone-600 mt-1">
                Required chores gate access to Extra Chores. A kid unlocks Extras if they finished all required chores last week OR finish them this week.
              </div>
            </div>
          </label>
        )}

        <button disabled={!canSubmit}
                onClick={() => onAdd({
                  title: title.trim(),
                  description: description.trim(),
                  value: parseFloat(value),
                  icon,
                  frequency,
                  isRequiredForExtras: mode === 'assigned' ? isRequiredForExtras : false,
                  ...(mode === 'extra' ? { isExtra: true, maxClaimers } : { assignedToIds }),
                })}
                className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          {mode === 'extra' ? 'Add extra chore' :
           assignedToIds.length > 1 ? `Add chore to ${assignedToIds.length} kids` : 'Add chore'}
        </button>
      </div>
    </ModalShell>
  );
}

function EditKidModal({ kid, onSave, onClose }) {
  const [name, setName] = useState(kid.name);
  const [weeklyAllowance, setWeeklyAllowance] = useState(String(kid.weeklyAllowance ?? 0));
  const [age, setAge] = useState(String(kid.age ?? 0));
  const [avatar, setAvatar] = useState(kid.avatar);
  const [color, setColor] = useState(kid.color);

  const canSubmit = name.trim().length > 0 && !isNaN(parseFloat(weeklyAllowance)) && !isNaN(parseInt(age));

  return (
    <ModalShell onClose={onClose} title={`Edit ${kid.name}`}>
      <div className="space-y-4">
        <Field label="Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-stone-50 rounded-2xl">
            {DEDUPED_KID_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'bg-amber-200 scale-110' : 'hover:bg-stone-200'}`}>{a}</button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-2xl transition ${color === c ? 'ring-4 ring-offset-2 scale-110' : ''}`}
                      style={{ background: c, '--tw-ring-color': c }} />
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input type="number" min="1" max="25" value={age} onChange={(e) => setAge(e.target.value)}
                   className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
          <Field label="Weekly bonus ($)">
            <input type="number" step="0.5" min="0" value={weeklyAllowance} onChange={(e) => setWeeklyAllowance(e.target.value)}
                   className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
        </div>
        <button disabled={!canSubmit}
                onClick={() => onSave({ name: name.trim(), avatar, color, age: parseInt(age), weeklyAllowance: parseFloat(weeklyAllowance) || 0 })}
                className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          Save changes
        </button>
      </div>
    </ModalShell>
  );
}

function AddKidModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('8');
  const [avatar, setAvatar] = useState('🐨');
  const [color, setColor] = useState('#8B5CF6');
  const [weeklyAllowance, setWeeklyAllowance] = useState('3');
  const canSubmit = name.trim() && !isNaN(parseInt(age));
  return (
    <ModalShell onClose={onClose} title="Add kid">
      <div className="space-y-4">
        <Field label="Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Maya" autoFocus
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-stone-50 rounded-2xl">
            {DEDUPED_KID_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'bg-amber-200 scale-110' : 'hover:bg-stone-200'}`}>{a}</button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-10 h-10 rounded-2xl transition ${color === c ? 'ring-4 ring-offset-2 scale-110' : ''}`}
                      style={{ background: c, '--tw-ring-color': c }} />
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <input type="number" min="1" max="25" value={age} onChange={(e) => setAge(e.target.value)}
                   className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
          <Field label="Weekly bonus ($)">
            <input type="number" step="0.5" min="0" value={weeklyAllowance} onChange={(e) => setWeeklyAllowance(e.target.value)}
                   className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
        </div>
        <button disabled={!canSubmit} onClick={() => onAdd({ name: name.trim(), age: parseInt(age), avatar, color, weeklyAllowance: parseFloat(weeklyAllowance) || 0 })}
                className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          Add kid
        </button>
      </div>
    </ModalShell>
  );
}

function AddParentModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('👤');
  const [pin, setPin] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const canSubmit = name.trim() && /^\d{4}$/.test(pin);
  return (
    <ModalShell onClose={onClose} title="Add parent">
      <div className="space-y-4">
        <Field label="Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Grandma" autoFocus
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-stone-50 rounded-2xl">
            {DEDUPED_PARENT_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'bg-amber-200 scale-110' : 'hover:bg-stone-200'}`}>{a}</button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-full transition-all ${color === c ? 'ring-4 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                      style={{ background: c, ringColor: c }} />
            ))}
          </div>
        </Field>
        <Field label="4-digit PIN">
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
                 className="w-full text-center text-2xl font-black tracking-[0.5em] bg-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <button disabled={!canSubmit} onClick={() => onAdd({ name: name.trim(), avatar, pin, color })}
                className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          Add parent
        </button>
      </div>
    </ModalShell>
  );
}

function EditParentModal({ parent, onSave, onClose }) {
  const [name, setName] = useState(parent.name);
  const [avatar, setAvatar] = useState(parent.avatar);
  const [color, setColor] = useState(parent.color || COLORS[0]);
  const canSubmit = name.trim().length > 0;
  return (
    <ModalShell onClose={onClose} title="Edit parent">
      <div className="space-y-4">
        <Field label="Name">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-stone-50 rounded-2xl">
            {DEDUPED_PARENT_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'scale-110' : 'hover:bg-stone-200'}`}
                      style={avatar === a ? { background: color + '40' } : {}}>{a}</button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} type="button" onClick={() => setColor(c)}
                      className={`w-9 h-9 rounded-full transition-all ${color === c ? 'ring-4 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                      style={{ background: c }} />
            ))}
          </div>
        </Field>
        <button disabled={!canSubmit} onClick={() => onSave({ name: name.trim(), avatar, color })}
                className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          Save changes
        </button>
      </div>
    </ModalShell>
  );
}

function ChangePinModal({ parent, onClose }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const submit = async () => {
    setError('');
    const res = await api.changePin(parent.id, currentPin, newPin);
    if (res.ok) {
      setSuccess(true);
      setTimeout(onClose, 1200);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error === 'bad current pin' ? 'Current PIN is wrong' : 'Could not change PIN');
    }
  };
  const canSubmit = /^\d{4}$/.test(currentPin) && /^\d{4}$/.test(newPin);
  return (
    <ModalShell onClose={onClose} title="Change PIN">
      {success ? (
        <div className="text-center py-6">
          <div className="text-5xl mb-3">✅</div>
          <div className="font-black text-stone-900">PIN updated!</div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Current PIN">
            <input type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" autoFocus
                   className="w-full text-center text-2xl font-black tracking-[0.5em] bg-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
          <Field label="New PIN">
            <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
                   className="w-full text-center text-2xl font-black tracking-[0.5em] bg-stone-100 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
          {error && <div className="text-sm font-bold text-red-600 bg-red-50 rounded-xl p-3">{error}</div>}
          <button disabled={!canSubmit} onClick={submit}
                  className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
            Update PIN
          </button>
        </div>
      )}
    </ModalShell>
  );
}


function PromoteButton({ cc, kid, family, reload }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-1 rounded-full transition whitespace-nowrap">
        + Make a chore
      </button>
      {open && (
        <PromoteToChoreModal
          cc={cc} kid={kid} family={family}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); reload(); }}
        />
      )}
    </>
  );
}

function PromoteToChoreModal({ cc, kid, family, onClose, onDone }) {
  const [mode, setMode] = useState('required'); // 'required' or 'extra'
  const [assignedTo, setAssignedTo] = useState(kid?.id || '');
  const [frequency, setFrequency] = useState('weekly');
  const [value, setValue] = useState(String((cc.value || 0).toFixed(2)));
  const [title, setTitle] = useState(cc.title || '');
  const [icon, setIcon] = useState(cc.icon || '✨');
  const [saving, setSaving] = useState(false);

  const CADENCE_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 Weeks' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const numericValue = parseFloat(value);
  const canSave = title.trim().length > 0 && !isNaN(numericValue) && numericValue >= 0;

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      await fetch('/api/chores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          icon,
          value: numericValue,
          assignedTo: mode === 'required' ? assignedTo : null,
          frequency,
          isRequiredForExtras: mode === 'required',
          maxClaimers: 1,
        }),
      });
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={onClose} title="Make this a chore">
      <div className="space-y-4">
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-3 text-xs font-semibold text-indigo-900">
          This will create a new chore based on "{cc.title}". The original "Other" entry stays in History.
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-1 block">Chore name</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
            className="w-full px-4 py-3 rounded-2xl bg-stone-100 outline-none focus:ring-4 focus:ring-indigo-300 text-stone-900 font-semibold" />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2 block">Chore type</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('required')}
              className={`py-3 rounded-2xl font-black text-sm transition border-2 ${mode === 'required' ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-stone-100 text-stone-700 border-transparent hover:bg-stone-200'}`}>
              🔒 Required chore
            </button>
            <button onClick={() => setMode('extra')}
              className={`py-3 rounded-2xl font-black text-sm transition border-2 ${mode === 'extra' ? 'bg-amber-400 text-stone-900 border-amber-400' : 'bg-stone-100 text-stone-700 border-transparent hover:bg-stone-200'}`}>
              ⭐ Extra chore
            </button>
          </div>
          <div className="text-xs text-stone-500 font-semibold mt-1">
            {mode === 'required' ? 'Assigned to a specific kid and counts toward their bonus.' : 'Anyone in the family can claim this for extra cash.'}
          </div>
        </div>

        {mode === 'required' && family.kids.length > 1 && (
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2 block">Assign to</label>
            <div className="flex gap-2 flex-wrap">
              {family.kids.map(k => (
                <button key={k.id} onClick={() => setAssignedTo(k.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl font-bold text-sm transition border-2 ${assignedTo === k.id ? 'border-indigo-400 bg-indigo-50' : 'border-stone-200 hover:border-stone-300 bg-white'}`}>
                  <span>{k.avatar}</span><span>{k.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2 block">Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {CADENCE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setFrequency(opt.value)}
                className={`py-2 rounded-xl font-black text-sm transition ${frequency === opt.value ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-1 block">Dollar value</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-black">$</span>
            <input type="number" min="0" step="0.25" value={value} onChange={(e) => setValue(e.target.value)}
              className="w-full pl-7 pr-4 py-3 rounded-2xl bg-stone-100 outline-none focus:ring-4 focus:ring-indigo-300 text-stone-900 font-semibold" />
          </div>
        </div>

        <button onClick={handleSave} disabled={!canSave || saving}
          className="w-full py-3 rounded-2xl font-black bg-indigo-500 hover:bg-indigo-600 disabled:bg-stone-200 disabled:text-stone-400 text-white transition shadow-lg shadow-indigo-200 disabled:shadow-none">
          {saving ? 'Saving…' : 'Create chore'}
        </button>
      </div>
    </ModalShell>
  );
}

function PickKidThenOtherModal({ family, onClose, onPick }) {
  return (
    <ModalShell onClose={onClose} title="Who did it?">
      <div className="grid grid-cols-2 gap-3">
        {family.kids.map(kid => (
          <button key={kid.id} onClick={() => onPick(kid.id)}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-stone-200 hover:border-amber-300 hover:bg-amber-50 transition">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: kid.color + '30' }}>{kid.avatar}</div>
            <div className="font-black text-stone-900">{kid.name}</div>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

function OtherChoreModal({ kid, onClose, onSubmit, isParent }) {
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState('✨');
  const [value, setValue] = useState('');
  const ICONS = ['✨', '🌟', '💪', '🤝', '🧺', '🧹', '🐾', '🌳', '🚗', '🧽', '📚', '🎨'];
  const QUICK_PICKS = [1, 2, 5];
  const trimmed = title.trim();
  const numericValue = parseFloat(value);
  const canSubmit = trimmed.length > 0 && trimmed.length <= 60 && (!isParent || (!isNaN(numericValue) && numericValue >= 0));

  return (
    <ModalShell onClose={onClose} title={isParent ? `Log for ${kid.name}` : 'What did you do?'}>
      <div className="space-y-4">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 text-xs font-semibold text-amber-900">
          {isParent
            ? 'Log something this kid did. Set the dollar value and it\'ll be added right away.'
            : 'Describe what you did. Your parent will check it and decide how much it\'s worth.'}
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-1 block">What was it?</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={60}
            placeholder="e.g. Helped unload groceries"
            className="w-full px-4 py-3 rounded-2xl bg-stone-100 outline-none focus:ring-4 focus:ring-amber-300 text-stone-900 font-semibold"
          />
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2 block">Pick an icon</label>
          <div className="grid grid-cols-6 gap-2">
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`aspect-square rounded-2xl text-2xl flex items-center justify-center transition ${icon === ic ? 'bg-amber-400 ring-2 ring-amber-500' : 'bg-stone-100 hover:bg-stone-200'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {isParent && (
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-stone-500 mb-2 block">How much is it worth?</label>
            <div className="flex gap-2 mb-2">
              {QUICK_PICKS.map(amt => (
                <button key={amt} onClick={() => setValue(String(amt.toFixed(2)))}
                  className={`flex-1 py-2 rounded-xl font-black text-sm transition ${value === amt.toFixed(2) ? 'bg-amber-400 text-stone-900' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'}`}>
                  ${amt}
                </button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500 font-black">$</span>
              <input
                type="number" min="0" step="0.25" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder="Custom amount"
                className="w-full pl-7 pr-4 py-3 rounded-2xl bg-stone-100 outline-none focus:ring-4 focus:ring-amber-300 text-stone-900 font-semibold"
              />
            </div>
          </div>
        )}

        <button onClick={() => canSubmit && onSubmit({ title: trimmed, icon, value: isParent ? numericValue : 0 })} disabled={!canSubmit}
          className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          {isParent ? 'Add it' : 'Send for approval'}
        </button>
      </div>
    </ModalShell>
  );
}

function PayoutModal({ kid, currentBalance, onClose, onConfirm }) {
  const [amount, setAmount] = useState(String(currentBalance.toFixed(2)));
  const [note, setNote] = useState('Apple Cash');
  const amt = parseFloat(amount);
  const canSubmit = !isNaN(amt) && amt > 0 && amt <= currentBalance;
  const NOTE_PICKS = ['Apple Cash', 'Purchased by Parent'];

  return (
    <ModalShell onClose={onClose} title={`Pay ${kid.name}`}>
      <div className="space-y-4">
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl" style={{ background: kid.color + '20' }}>{kid.avatar}</div>
          <div className="flex-1">
            <div className="text-xs font-bold text-stone-500 uppercase">Unpaid balance</div>
            <div className="display-font text-2xl font-black text-emerald-700">${currentBalance.toFixed(2)}</div>
          </div>
        </div>

        <Field label="Amount to pay out">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</div>
            <input type="number" step="0.25" min="0" max={currentBalance} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
                   className="w-full bg-stone-100 rounded-2xl pl-8 pr-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setAmount(currentBalance.toFixed(2))}
                    className="flex-1 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black hover:bg-emerald-200 transition">
              Pay all ${currentBalance.toFixed(2)}
            </button>
            <button type="button" onClick={() => setAmount((currentBalance / 2).toFixed(2))}
                    className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-700 text-xs font-black hover:bg-stone-200 transition">
              Half
            </button>
          </div>
        </Field>

        <Field label="Payment method">
          <div className="flex gap-2 mb-2">
            {NOTE_PICKS.map(pick => (
              <button key={pick} type="button" onClick={() => setNote(pick)}
                className={`flex-1 py-2 rounded-xl text-xs font-black transition ${note === pick ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}>
                {pick}
              </button>
            ))}
          </div>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or type a custom note"
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>

        {!isNaN(amt) && amt > 0 && amt <= currentBalance && (
          <div className="bg-stone-50 rounded-2xl p-3 text-xs font-bold text-stone-600">
            After payout: <span className="text-stone-900">${(currentBalance - amt).toFixed(2)}</span> will remain in {kid.name}'s balance.
          </div>
        )}

        <button disabled={!canSubmit} onClick={() => onConfirm(amt, note)}
                className="w-full py-3 rounded-2xl font-black bg-emerald-500 hover:bg-emerald-600 disabled:bg-stone-200 disabled:text-stone-400 text-white transition shadow-lg shadow-emerald-200 disabled:shadow-none">
          Pay out ${!isNaN(amt) ? amt.toFixed(2) : '0.00'}
        </button>
      </div>
    </ModalShell>
  );
}

function EditChoreModal({ chore, kids, onSave, onClose }) {
  const [title, setTitle] = useState(chore.title);
  const [description, setDescription] = useState(chore.description || '');
  const [value, setValue] = useState(String(chore.value));
  const [icon, setIcon] = useState(chore.icon);
  const [frequency, setFrequency] = useState(chore.frequency);
  const [mode, setMode] = useState(chore.assignedTo === null ? 'extra' : 'assigned');
  const [assignedTo, setAssignedTo] = useState(chore.assignedTo);
  const [isRequiredForExtras, setIsRequiredForExtras] = useState(!!chore.isRequiredForExtras);
  const [maxClaimers, setMaxClaimers] = useState(chore.maxClaimers || 1);

  const canSubmit = title.trim() && !isNaN(parseFloat(value)) && (mode === 'extra' || assignedTo);

  return (
    <ModalShell onClose={onClose} title="Edit chore">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-2xl">
          <button type="button" onClick={() => setMode('assigned')}
                  className={`py-2.5 rounded-xl text-sm font-black transition ${mode === 'assigned' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
            Assigned
          </button>
          <button type="button" onClick={() => setMode('extra')}
                  className={`py-2.5 rounded-xl text-sm font-black transition flex items-center justify-center gap-1 ${mode === 'extra' ? 'bg-white text-amber-700 shadow-sm' : 'text-stone-500'}`}>
            <Sparkles size={14} /> Extra
          </button>
        </div>

        <Field label="Name">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Description (optional)">
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={120}
                 placeholder="e.g., Fill bowl with 1 scoop of food and fresh water"
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold text-sm outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Icon">
          <div className="grid grid-cols-7 gap-2 max-h-52 overflow-y-auto p-2 bg-stone-50 rounded-2xl">
            {DEDUPED_EMOJI_OPTIONS.map(e => (
              <button key={e} type="button" onClick={() => setIcon(e)}
                      className={`text-2xl p-2 rounded-xl transition ${icon === e ? 'bg-amber-200 scale-110' : 'hover:bg-stone-200'}`}>{e}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value ($)">
            <input type="number" step="0.25" min="0" value={value} onChange={(e) => setValue(e.target.value)}
                   className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </Field>
          <Field label="How often">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300">
              {CADENCE_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {mode === 'assigned' && (
          <Field label="Assigned to">
            <div className="grid grid-cols-3 gap-2">
              {kids.map(kid => (
                <button key={kid.id} type="button" onClick={() => setAssignedTo(kid.id)}
                        className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl font-bold transition border-2 ${assignedTo === kid.id ? 'bg-white shadow-md' : 'bg-stone-100 hover:bg-stone-200 border-transparent opacity-60'}`}
                        style={{ borderColor: assignedTo === kid.id ? kid.color : 'transparent' }}>
                  <div className="text-2xl">{kid.avatar}</div>
                  <div className="text-sm">{kid.name}</div>
                </button>
              ))}
            </div>
          </Field>
        )}

        {mode === 'assigned' && (
          <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${isRequiredForExtras ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200 hover:border-stone-300'}`}>
            <input type="checkbox" checked={isRequiredForExtras}
                   onChange={(e) => setIsRequiredForExtras(e.target.checked)}
                   className="mt-0.5 w-5 h-5 rounded accent-amber-500 cursor-pointer flex-shrink-0" />
            <div className="flex-1">
              <div className="font-black text-sm text-stone-900 flex items-center gap-1">
                <Lock size={12} /> Required for Extra Chores
              </div>
              <div className="text-xs font-semibold text-stone-600 mt-1">
                Required chores gate access to Extra Chores. A kid unlocks Extras if they finished all required chores last week OR finish them this week.
              </div>
            </div>
          </label>
        )}

        <button disabled={!canSubmit}
                onClick={() => onSave({
                  title: title.trim(),
                  description: description.trim(),
                  value: parseFloat(value),
                  icon,
                  frequency,
                  assignedTo: mode === 'extra' ? null : assignedTo,
                  isRequiredForExtras: mode === 'assigned' ? isRequiredForExtras : false,
                  maxClaimers: mode === 'extra' ? maxClaimers : 1,
                })}
                className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          Save changes
        </button>
      </div>
    </ModalShell>
  );
}

function AddGoalModal({ kid, onAdd, onClose }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('20');
  const [icon, setIcon] = useState('🎮');
  const ICONS = ['🎮', '🎁', '🧸', '🚲', '📱', '⚽', '🎨', '📚', '🎧', '🍭', '🛹', '✈️'];
  const canSubmit = title.trim() && !isNaN(parseFloat(target)) && parseFloat(target) > 0;
  return (
    <ModalShell onClose={onClose} title={`Savings goal for ${kid.name}`}>
      <div className="space-y-4">
        <Field label="What are they saving for?">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Nintendo Switch game" autoFocus
                 className="w-full bg-stone-100 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
        </Field>
        <Field label="Icon">
          <div className="grid grid-cols-6 gap-2">
            {ICONS.map(i => (
              <button key={i} type="button" onClick={() => setIcon(i)}
                      className={`text-3xl p-2 rounded-xl transition ${icon === i ? 'bg-amber-200 scale-110' : 'bg-stone-100 hover:bg-stone-200'}`}>{i}</button>
            ))}
          </div>
        </Field>
        <Field label="Target amount">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</div>
            <input type="number" step="1" min="1" value={target} onChange={(e) => setTarget(e.target.value)}
                   className="w-full bg-stone-100 rounded-2xl pl-8 pr-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-amber-300" />
          </div>
        </Field>
        <button disabled={!canSubmit} onClick={() => onAdd({ kidId: kid.id, title: title.trim(), icon, target: parseFloat(target) })}
                className="w-full py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 disabled:bg-stone-200 disabled:text-stone-400 text-stone-900 transition shadow-lg shadow-amber-200 disabled:shadow-none">
          Add goal
        </button>
      </div>
    </ModalShell>
  );
}

function ConfirmDeleteModal({ item, onConfirm, onCancel }) {
  return (
    <ModalShell onClose={onCancel} title="Are you sure?">
      <div className="space-y-4">
        <div className="bg-red-50 text-red-900 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm font-semibold">
            Remove <b>{item.name}</b>?
            {item.type === 'kid' && ' All their chores and history will be deleted too.'}
            {item.type === 'chore' && ' This will also remove all completion history.'}
            {item.type === 'parent' && ' They won\'t be able to sign in anymore.'}
            {item.type === 'goal' && ' This savings goal will be removed.'}
            {item.type === 'payout' && ' This payout will be deleted and the amount returned to their balance.'}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl font-black bg-stone-100 hover:bg-stone-200 text-stone-700 transition">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl font-black bg-red-500 hover:bg-red-600 text-white transition shadow-lg shadow-red-200">Delete</button>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-widest text-stone-500 block mb-2">{label}</label>
      {children}
    </div>
  );
}

function NavButton({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all relative ${active ? 'text-amber-600' : 'text-stone-400 hover:text-stone-700'}`}>
      <div className="relative">
        {icon}
        {badge > 0 && <div className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{badge}</div>}
      </div>
      <div className={`text-[11px] font-black ${active ? 'text-amber-600' : ''}`}>{label}</div>
      {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-500" />}
    </button>
  );
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)' }}>
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-amber-600 mx-auto mb-3" />
        <div className="font-black text-stone-700">Loading Chorely...</div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
      <div className="bg-white rounded-3xl p-8 max-w-md text-center shadow-sm">
        <div className="text-5xl mb-3">😬</div>
        <div className="font-black text-xl text-stone-900 mb-2">Connection problem</div>
        <div className="text-sm text-stone-500 mb-5">{message}</div>
        <button onClick={onRetry} className="px-6 py-3 rounded-2xl font-black bg-amber-400 hover:bg-amber-500 text-stone-900 transition">
          Try again
        </button>
      </div>
    </div>
  );
}
