import React, { useState, useEffect, useCallback } from 'react';
import { Check, Plus, X, Home, Clock, History, Settings, Trash2, Trophy, AlertCircle, KeyRound, Loader2, Pencil, Sparkles, Lock, Flame, Target, Wallet, DollarSign } from 'lucide-react';
import { Glass, GlassPill } from './components/Glass.jsx';
import PillButton from './components/PillButton.jsx';
import Tag from './components/Tag.jsx';
import ProgressRing from './components/ProgressRing.jsx';
import KidCard from './components/KidCard.jsx';
import ApprovalRow from './components/ApprovalRow.jsx';

// Chore icons — grouped by category for readability (the UI shows them in a grid)
const EMOJI_OPTIONS = [
  // Bedroom
  '🛏️', '🧸', '📚', '🎒', '👕', '🧺', '🧦',
  // Kitchen / eating
  '🍽️', '🍴', '🥣', '🧽', '🥄', '🍎', '🥛', '🧃', '🍞', '🥗', '🍳', '🧊',
  // Cleaning
  '🧹', '🧼', '🧴', '🗑️', '♻️', '🧻', '🪣', '🧯', '🪒', '🚽',
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
  '🚗', '🧰', '🔧', '🪑', '🚪', '💡', '📦', '🪟','🚙',
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
const COLORS = ['var(--u)', '#10B981', '#3B82F6', '#EC4899', '#8B5CF6', '#EF4444', '#14B8A6', '#F97316'];

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
  // For simplicity in the prototype, we'll only sum approved completions. Perfect-week bonus gets credited
  // separately each week via the "pay out bonus" button that parents can hit at the end of a week.
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
    return choreSum + customSum;
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
          // Every day in the week needs a completion
          const completedDates = new Set(completionsForThis.map(c => c.date));
          return weekDates.every(d => completedDates.has(d));
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
    <div className="min-h-screen relative overflow-hidden" style={{ '--u': currentUser.color || '#FFC233', background: '#0A0908' }}>
      {/* Ambient color blobs — pulled from current user */}
      <div className="blob blob-a" style={{ background: currentUser.color || '#FFC233', top: '-6rem', left: '-6rem' }} />
      <div className="blob blob-b" style={{ background: family.kids[0]?.color || '#EC4899', top: '40%', right: '-8rem' }} />
      <div className="blob blob-c" style={{ background: family.kids[1]?.color || '#0EA5E9', bottom: '-6rem', left: '20%' }} />

      {/* Header */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--u-tint)' }}>
              {currentUser.avatar}
            </div>
            <div>
              <div className="mono-up text-ink-300">
                {currentUser.role === 'parent' ? 'Parent' : 'Kid'}
              </div>
              <div className="display-font text-xl font-bold text-white leading-none">Hi, {currentUser.name}</div>
            </div>
          </div>
          <button onClick={logout} className="text-sm font-semibold text-ink-300 hover:text-white px-3 py-2 rounded-xl hover:bg-white/10 transition">
            Switch
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-28 pt-6 relative z-10">
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
      <nav className="fixed bottom-0 left-0 right-0 bg-black/50 backdrop-blur-xl border-t border-white/10 z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
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

  // Build ambient blob colors from family — kids first, then parents, fallback to brand palette.
  const blobColors = [
    family.kids[0]?.color, family.kids[1]?.color, family.kids[2]?.color,
    family.parents[0]?.color, '#FFC233', '#EC4899', '#0EA5E9',
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ background: '#0A0908' }}>
      {/* Floating ambient color blobs */}
      <div className="blob blob-a" style={{ background: blobColors[0] || '#FFC233', top: '-4rem', left: '-4rem' }} />
      <div className="blob blob-b" style={{ background: blobColors[1] || '#EC4899', top: '6rem', right: '-6rem' }} />
      <div className="blob blob-c" style={{ background: blobColors[2] || '#0EA5E9', bottom: '-6rem', left: '30%' }} />
      {blobColors[3] && <div className="blob blob-a" style={{ background: blobColors[3], bottom: '20%', right: '20%', animationDelay: '4s' }} />}

      <div className="max-w-2xl w-full relative z-10">
        <div className="text-center mb-6 float-in">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full glass mb-3">
            <span className="text-base leading-none">⭐</span>
            <span className="mono-up text-ink-700">Family Edition</span>
          </div>
          <h1 className="display-font text-5xl md:text-6xl font-black text-ink-900 tracking-tight leading-none">Chorely</h1>
          <p className="text-ink-700 text-sm font-semibold mt-2">Who's using the app?</p>
        </div>

        <Glass strong className="rounded-3xl p-4 md:p-5 float-in space-y-5" style={{ animationDelay: '0.1s' }}>
          {family.parents.length > 0 && (
            <div>
              <div className="mono-up text-ink-500 mb-2 px-1">Parents</div>
              <div className="flex gap-2 flex-wrap">
                {family.parents.map(p => (
                  <button
                    key={p.id}
                    onClick={() => onSelectProfile(p, 'parent')}
                    className="glass-tile flex-1 min-w-[140px] rounded-2xl px-3 py-2.5 flex items-center gap-2.5"
                    style={{ '--u': p.color || '#FFC233' }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'var(--u-tint)' }}>{p.avatar}</div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="font-bold text-ink-900 truncate text-sm">{p.name}</div>
                      <div className="mono-up text-ink-500 mt-0.5 flex items-center gap-1"><KeyRound size={9} /> PIN</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mono-up text-ink-500 mb-2 px-1">Kids</div>
            {family.kids.length === 0 ? (
              <div className="text-center py-6 text-ink-500 font-semibold text-sm">No kids added yet.</div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-2.5">
                {family.kids.map(k => (
                  <button
                    key={k.id}
                    onClick={() => onSelectProfile(k, 'kid')}
                    className="glass-tile relative overflow-hidden rounded-2xl p-3 flex flex-col items-center gap-1.5"
                    style={{ '--u': k.color }}
                  >
                    <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: 'var(--u)' }} />
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--u-tint)' }}>{k.avatar}</div>
                    <div className="font-bold text-ink-900 text-sm leading-tight">{k.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Glass>
      </div>

      {pinTarget && (
        <div className="fixed inset-0 bg-ink-900/30 backdrop-blur-2xl flex items-center justify-center p-4 z-50" onClick={onCancelPin}>
          <Glass
            strong
            className={`rounded-3xl p-8 max-w-sm w-full pop-in ${pinError ? 'shake' : ''}`}
            onClick={(e) => e.stopPropagation()}
            style={{ '--u': pinTarget.color || '#FFC233' }}
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto rounded-2xl grid place-items-center text-4xl mb-3 shadow-glow" style={{ background: 'var(--u-tint)' }}>{pinTarget.avatar}</div>
              <h2 className="display-font text-2xl font-black text-ink-900">Hi, {pinTarget.name}</h2>
              <p className="mono-up text-ink-500 mt-1">Enter your PIN</p>
            </div>
            <input
              type="password" inputMode="numeric" pattern="[0-9]*"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
              onKeyDown={(e) => e.key === 'Enter' && doSubmit()}
              autoFocus
              className="w-full text-center text-4xl mono font-extrabold tracking-[0.6em] bg-white/60 backdrop-blur rounded-2xl py-5 mb-5 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)] text-ink-900 border border-white/70"
              placeholder="••••" maxLength={4}
            />
            <div className="flex gap-3">
              <PillButton kind="ghost" className="flex-1" onClick={onCancelPin}>Cancel</PillButton>
              <PillButton kind="primary" className="flex-1" onClick={doSubmit}>Enter</PillButton>
            </div>
          </Glass>
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
          <div className="mono-up text-ink-300">{dateStr}</div>
          <h2 className="display-font text-3xl md:text-4xl font-black text-white mt-1">Today's Progress</h2>
        </div>
        {family.kids.length === 0 && (
          <div className="glass-strong rounded-3xl p-12 text-center slide-up">
            <div className="text-5xl mb-3">👶</div>
            <div className="font-bold text-ink-900">No kids yet</div>
            <div className="text-sm text-ink-500 mt-1">Add a family member in the Manage tab.</div>
          </div>
        )}
        {family.kids.length > 0 && (
          <div className="slide-up -mx-4" style={{ animationDelay: '0.04s' }}>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-2">
              {family.kids.map(kid => {
                const kchores = getChoresForKid(kid.id);
                const kdaily = kchores.filter(c => c.frequency === 'daily');
                const kdone = kdaily.filter(c => isChoreCompletedToday(c.id, kid.id)).length;
                const kbalance = getCurrentBalance ? getCurrentBalance(kid.id) : 0;
                const kstreak = getStreak ? getStreak(kid.id) : { current: 0 };
                return (
                  <KidCard
                    key={kid.id}
                    kid={{
                      id: kid.id,
                      name: kid.name,
                      avatar: kid.avatar,
                      color: kid.color,
                      age: kid.age ?? '',
                      balance: kbalance,
                      streak: kstreak.current,
                      weekProgress: kdaily.length > 0 ? kdone / kdaily.length : 0,
                    }}
                  />
                );
              })}
            </div>
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
              <div className="bg-[color:var(--u-tint)] border border-ink-200 rounded-3xl p-4 space-y-2">
                <div className="mono-up text-ink-700 mb-2">✨ "Other" Submissions</div>
                {allOthers.map(cc => {
                  const kid = family.kids.find(k => k.id === cc.kidId);
                  if (!kid) return null;
                  return (
                    <div key={cc.id} className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${cc.status === 'rejected' ? 'bg-red-50' : cc.status === 'approved' ? 'bg-emerald-50' : 'bg-white'}`} style={{ '--u': kid.color }}>
                      <div className={`text-xl ${cc.status === 'rejected' ? 'opacity-40' : ''}`}>{cc.icon || '✨'}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold truncate ${cc.status === 'rejected' ? 'text-ink-500 line-through' : 'text-ink-900'}`}>{cc.title}</div>
                        <div className="mono text-[11px] text-ink-500 font-semibold flex items-center gap-1 mt-0.5">
                          <span>{kid.avatar}</span><span>{kid.name.toUpperCase()}</span><span>·</span><span>{cc.date}</span>
                        </div>
                      </div>
                      {cc.status === 'pending' && <Tag tone="warn">⏳ Pending</Tag>}
                      {cc.status === 'approved' && <span className="mono font-extrabold text-emerald-600 flex-shrink-0">+${(cc.value || 0).toFixed(2)}</span>}
                      {cc.status === 'rejected' && <Tag tone="bad">✗ Rejected</Tag>}
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
              className="w-full glass border border-dashed border-white/20 hover:border-brand rounded-3xl p-4 flex items-center justify-center gap-3 transition group"
            >
              <div className="text-2xl">✨</div>
              <div className="display-font text-base font-black text-ink-900">Log an "Other" for a kid</div>
              <Plus size={20} className="text-ink-500 group-hover:text-ink-900 ml-auto" strokeWidth={3} />
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
        <div className="mono-up text-ink-300">{dateStr}</div>
        <h2 className="display-font text-3xl md:text-4xl font-black text-white mt-1">Let's do this! ✨</h2>
      </div>

      <div className="rounded-3xl p-6 text-white slide-up shadow-xl relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg, var(--u) 0%, color-mix(in oklab, var(--u) 80%, black) 100%)', animationDelay: '0.05s' }}>
        <div className="absolute -right-8 -top-8 text-9xl opacity-10">💰</div>
        <div className="relative flex items-start gap-5">
          <div className="flex-1 min-w-0">
            <div className="mono-up opacity-80">My Balance</div>
            <div className="mono font-extrabold text-5xl md:text-6xl tracking-tight mt-1">${balance.toFixed(2)}</div>
            <div className="text-sm font-semibold opacity-90 mt-1">Unpaid earnings</div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {dailyChores.length > 0 && (
              <ProgressRing
                progress={completedToday / dailyChores.length}
                label={`${completedToday}/${dailyChores.length}`}
                size={84}
                stroke={6}
              />
            )}
            {streak.current > 0 && (
              <GlassPill className="!text-white">
                <Flame size={12} fill="currentColor" />
                {streak.current}w streak
              </GlassPill>
            )}
          </div>
        </div>
        <div className="relative flex items-center gap-3 mt-4 text-sm font-semibold opacity-90 flex-wrap pt-3 border-t border-white/20">
          <div>This week: <span className="mono font-extrabold">${earnings.total.toFixed(2)}</span></div>
          <div className="opacity-60">·</div>
          <div>💼 <span className="mono">${earnings.choreEarnings.toFixed(2)}</span></div>
          {earnings.extraEarnings > 0 && <div>⭐ <span className="mono">${earnings.extraEarnings.toFixed(2)}</span></div>}
          {earnings.allDone && <div>🎁 <span className="mono">${currentUser.weeklyAllowance.toFixed(2)}</span></div>}
        </div>
        {!earnings.allDone && chores.length > 0 && (
          <div className="relative mt-2 text-xs font-semibold opacity-80">🎯 Finish all your required chores this week for a <span className="mono">${currentUser.weeklyAllowance}</span> bonus!</div>
        )}
      </div>

      {goals.length > 0 && (
        <div className="slide-up" style={{ animationDelay: '0.08s' }}>
          <div className="mono-up text-ink-300 mb-3 px-1 flex items-center gap-1">
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
        <div className="glass-strong rounded-3xl p-5 slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-ink-900">Today's chores</div>
            <div className="mono font-extrabold text-ink-900">{completedToday}/{dailyChores.length}</div>
          </div>
          <div className="h-3 bg-ink-50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: 'var(--u)' }} />
          </div>
        </div>
      )}

      {dailyChores.length > 0 && (
        <div className="slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="mono-up text-ink-300 mb-3 px-1">Every day</div>
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
          <div className="mono-up text-ink-300 mb-3 px-1">This week</div>
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
        <div className="glass-strong rounded-3xl p-12 text-center slide-up">
          <div className="text-5xl mb-3">🌟</div>
          <div className="font-bold text-ink-900">No chores yet!</div>
          <div className="text-sm text-ink-500 mt-1">Ask your parent to add some.</div>
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
            <div className="bg-[color:var(--u-tint)] rounded-3xl p-4 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="text-lg">✨</div>
                <div className="mono-up text-ink-700">"Other" Submissions</div>
              </div>
              {pending.map(cc => (
                <div key={cc.id} className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="text-2xl">{cc.icon || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-900 truncate">{cc.title}</div>
                    <div className="mono text-[11px] text-ink-500 font-semibold mt-0.5">Submitted {cc.date}</div>
                  </div>
                  <Tag tone="warn">⏳ Pending</Tag>
                </div>
              ))}
              {approved.map(cc => (
                <div key={cc.id} className="bg-emerald-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="text-2xl">{cc.icon || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-900 truncate">{cc.title}</div>
                    <div className="mono text-[11px] text-ink-500 font-semibold mt-0.5">{cc.date}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="mono font-extrabold text-emerald-600">+${(cc.value || 0).toFixed(2)}</div>
                    <Tag tone="ok">✓ Approved</Tag>
                  </div>
                </div>
              ))}
              {rejected.map(cc => (
                <div key={cc.id} className="bg-red-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="text-2xl opacity-40">{cc.icon || '✨'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-500 line-through truncate">{cc.title}</div>
                    <div className="mono text-[11px] text-ink-500 font-semibold">{cc.date}</div>
                  </div>
                  <Tag tone="bad">✗ Not approved</Tag>
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
          className="w-full glass border border-dashed border-white/20 hover:border-[color:var(--u)] rounded-3xl p-5 flex items-center justify-center gap-3 transition group"
        >
          <div className="text-3xl">✨</div>
          <div className="text-left">
            <div className="display-font text-lg font-black text-ink-900">Did something else?</div>
            <div className="text-xs font-semibold text-ink-500">Submit to your parent — they'll approve and set the amount</div>
          </div>
          <Plus size={22} className="text-ink-500 group-hover:text-[color:var(--u)] ml-auto" strokeWidth={3} />
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
    <div className={`rounded-3xl p-5 shadow-sm border ${eligible ? 'bg-[color:var(--u-tint)] border-[color:var(--u-tint)]' : 'bg-ink-50 border-ink-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        <div className="text-2xl">{eligible ? '⭐' : '🔒'}</div>
        <div className="display-font text-xl font-black text-ink-900">{title}</div>
      </div>
      <div className="text-xs font-semibold text-ink-700 mb-4 ml-9">{subtitle}</div>

      {!eligible && (
        <div className="bg-white rounded-2xl p-4 mb-4 border border-ink-200 flex items-start gap-3">
          <Lock size={20} className="text-ink-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-black text-ink-900 text-sm">Locked for now</div>
            <div className="text-xs text-ink-700 font-semibold mt-1">
              Finish all of your required chores this week to unlock Extra Chores. Staying on top of them last week would have unlocked you automatically!
            </div>
            {outstanding.length > 0 && (
              <>
                <div className="mono-up text-ink-500 mt-3 mb-1">Still need to do:</div>
                <div className="space-y-1">
                  {outstanding.map(chore => (
                    <div key={chore.id} className="flex items-center gap-2 text-xs font-bold text-ink-700">
                      <span className="text-base">{chore.icon}</span>
                      <span>{chore.title}</span>
                      <span className="mono-up text-ink-500">· {chore.frequency}</span>
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
            <div className="mono-up text-ink-500 mb-2 px-1">{label}</div>
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
  else if (claimedByMe && isPending) bg = 'bg-[color:var(--u-tint)] border-[color:var(--u)]';
  else if (isLockedForMe) bg = 'bg-paper border-ink-200 opacity-60';
  else if (poolFull) bg = 'bg-ink-50 border-ink-200 opacity-75';
  else bg = 'bg-white border-[color:var(--u-tint)] hover:border-[color:var(--u)] hover:shadow-md';

  const myCompDate = myClaim?.date ? new Date(myClaim.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

  return (
    <button
      onClick={isInteractive ? onToggle : undefined}
      disabled={!isInteractive}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all text-left border ${bg} ${!isInteractive ? 'cursor-default' : ''}`}
    >
      <div className="text-2xl flex-shrink-0">{chore.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-ink-900 ${claimedByMe && isApproved ? 'line-through opacity-60' : ''}`}>{chore.title}</div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <div className="mono font-extrabold text-xs text-[color:var(--u)]">${chore.value.toFixed(2)}</div>

          {/* Show each claimer as a small badge */}
          {claims.map(c => {
            const k = family.kids.find(kk => kk.id === c.kidId);
            if (!k) return null;
            const isMe = c.kidId === currentUser.id;
            const tone = c.status === 'approved' ? 'ok' : 'brand';
            return (
              <Tag key={c.completionId} tone={tone}>
                <span>{k.avatar}</span>
                <span>{isMe ? 'You' : k.name}</span>
                {c.status === 'approved' && <Check size={10} strokeWidth={3} />}
              </Tag>
            );
          })}

          {/* My personal claim status takes precedence */}
          {claimedByMe && isPending && <Tag tone="warn">Awaiting approval</Tag>}

          {/* Pool state for kids who aren't claimed yet */}
          {!claimedByMe && !isParent && (
            <>
              {isLockedForMe && !poolFull && eligible === false && (
                <Tag tone="neutral"><Lock size={9} /> LOCKED</Tag>
              )}
              {!isLockedForMe && poolFull && <Tag tone="neutral">Fully claimed</Tag>}
              {!isLockedForMe && !poolFull && (
                <Tag tone="brand">
                  {maxClaimers === 1 ? 'Up for grabs' : <>Up for grabs · <span className="mono">{spotsLeft}</span>/<span className="mono">{maxClaimers}</span> left</>}
                </Tag>
              )}
            </>
          )}

          {/* Parent view: show pool stats */}
          {isParent && maxClaimers > 1 && (
            <Tag tone="neutral"><span className="mono">{claimCount}/{maxClaimers}</span> claimed</Tag>
          )}
        </div>
      </div>
      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
        claimedByMe ? 'border-transparent' : isLockedForMe ? 'border-ink-200' : 'border-[color:var(--u)]'
      }`} style={{
        background: (claimedByMe && isApproved) ? '#10B981'
                  : (claimedByMe && isPending) ? 'var(--u)'
                  : poolFull ? '#DCD8D1'
                  : 'transparent'
      }}>
        {claimedByMe && <Check size={18} className="text-white" strokeWidth={3} />}
        {isLockedForMe && !claimedByMe && <Lock size={14} className="text-ink-500" />}
      </div>
    </button>
  );
}

function KidDashboardCard({ kid, chores, completedToday, totalToday, weekTotal, balance, streak, goals, reload, onToggleChore, isChoreCompletedToday, getChoreStatusToday }) {
  const [expanded, setExpanded] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const progressPct = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;
  return (
    <div className="glass-strong rounded-3xl overflow-hidden" style={{ '--u': kid.color, borderTop: `3px solid ${kid.color}` }}>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: 'var(--u-tint)' }}>{kid.avatar}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-black text-lg text-ink-900">{kid.name}</div>
              {streak && streak.current > 0 && (
                <Tag tone="warn">
                  <Flame size={11} fill="currentColor" /> <span className="mono">{streak.current}</span>
                </Tag>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              <div className="text-sm font-semibold text-ink-700"><span className="mono">{completedToday}/{totalToday}</span> today</div>
              <div className="w-1 h-1 rounded-full bg-ink-200" />
              <div className="text-sm font-black text-emerald-600 mono">${weekTotal.toFixed(2)} <span className="font-bold">this week</span></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-emerald-50 rounded-2xl p-3">
            <div className="mono-up text-emerald-700 flex items-center gap-1">
              <Wallet size={11} /> Balance
            </div>
            <div className="mono font-extrabold text-xl text-ink-900 mt-0.5">${(balance || 0).toFixed(2)}</div>
          </div>
          <button onClick={() => setShowPayout(true)}
                  disabled={!balance || balance <= 0}
                  className="bg-[color:var(--u)] disabled:bg-ink-50 disabled:text-ink-500 text-white rounded-2xl p-3 flex items-center justify-center gap-2 font-bold text-sm transition shadow-glow disabled:shadow-none active:scale-[0.98]">
            <DollarSign size={16} strokeWidth={3} /> Pay out
          </button>
        </div>

        {totalToday > 0 && (
          <div className="h-2 bg-ink-50 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'var(--u)' }} />
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
                className="w-full mt-3 py-2 text-xs font-black text-ink-500 hover:text-ink-900 transition flex items-center justify-center gap-1">
          {expanded ? 'Hide' : 'Show'} chores
          <span>{expanded ? '−' : '+'}</span>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-ink-100 p-4 bg-paper/50 space-y-2">
          {chores.length === 0 ? (
            <div className="text-sm text-ink-500 text-center py-4">No chores assigned</div>
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
      <div className={`rounded-xl p-2 ${reached ? 'bg-emerald-50' : 'bg-paper'}`} style={{ '--u': color }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="text-lg">{goal.icon}</div>
          <div className="flex-1 text-xs font-bold text-ink-900 truncate">{goal.title}</div>
          <div className="mono font-extrabold text-xs text-ink-700">${balance.toFixed(0)}/${goal.target.toFixed(0)}</div>
        </div>
        <div className="h-1.5 bg-white rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: reached ? '#10B981' : 'var(--u)' }} />
        </div>
      </div>
    );
  }
  return (
    <div className={`rounded-3xl p-5 shadow-sm ${reached ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-200' : 'bg-white'}`} style={{ '--u': color }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: reached ? '#10B98120' : 'var(--u-tint)' }}>{goal.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="font-black text-ink-900">{goal.title}</div>
          <div className="mono text-[11px] text-ink-500 mt-0.5">${balance.toFixed(2)} of ${goal.target.toFixed(2)}</div>
        </div>
        {reached && (
          <Tag tone="ok"><Trophy size={12} /> Reached!</Tag>
        )}
      </div>
      <div className="h-3 bg-ink-50 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: reached ? '#10B981' : 'var(--u)' }} />
      </div>
      <div className="mono-up text-ink-500 mt-2 text-right">{pct.toFixed(0)}% there</div>
    </div>
  );
}

function ChoreCard({ chore, completed, status, onToggle, color }) {
  const isPending = status === 'pending';
  const isApproved = status === 'approved';
  return (
    <button onClick={onToggle}
      style={{ '--u': color }}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left ${
        isApproved ? 'bg-emerald-50' : isPending ? 'bg-[color:var(--u-tint)]' : 'bg-white hover:bg-paper shadow-sm border border-ink-100'
      }`}>
      <div className="text-3xl flex-shrink-0">{chore.icon}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-ink-900 flex items-center gap-2 flex-wrap ${isApproved ? 'line-through opacity-60' : ''}`}>
          {chore.title}
          {chore.isRequiredForExtras && !isApproved && (
            <Tag tone="brand"><Lock size={8} /> REQUIRED</Tag>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <div className="mono font-extrabold text-sm" style={{ color: isApproved ? '#059669' : 'var(--u)' }}>${chore.value.toFixed(2)}</div>
          {isPending && <Tag tone="warn">Awaiting approval</Tag>}
          {isApproved && <Tag tone="ok">Approved ✓</Tag>}
        </div>
      </div>
      <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${completed ? 'border-transparent' : 'border-ink-200'}`}
           style={{ background: completed ? (isApproved ? '#10B981' : 'var(--u)') : 'transparent' }}>
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
      <div className="slide-up flex items-end justify-between gap-3">
        <div>
          <h2 className="display-font text-3xl md:text-4xl font-black text-white">Needs Approval</h2>
          <p className="text-ink-300 font-semibold mt-1">
            {total === 0 ? 'All caught up!' : `${total} ${total === 1 ? 'item' : 'items'} waiting for you`}
          </p>
        </div>
        {total > 0 && (
          <Tag tone="warn" className="!text-sm">
            <span className="mono">{total}</span> pending
          </Tag>
        )}
      </div>
      {total === 0 ? (
        <Glass strong className="rounded-3xl p-12 text-center slide-up">
          <div className="text-6xl mb-3">🎉</div>
          <div className="font-black text-xl text-ink-900">Nothing to approve</div>
          <div className="text-sm text-ink-500 mt-1">Come back later when the kids check off chores.</div>
        </Glass>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="slide-up space-y-2">
              <div className="mono-up text-ink-500 px-1">Chore completions</div>
              {pending.map((comp, i) => {
                const chore = family.chores.find(c => c.id === comp.choreId);
                const kid = family.kids.find(k => k.id === comp.kidId);
                if (!chore || !kid) return null;
                return (
                  <div key={comp.id} className="slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
                    <ApprovalRow
                      item={{
                        id: comp.id,
                        kid: { name: kid.name, color: kid.color },
                        choreTitle: chore.title,
                        icon: chore.icon,
                        value: chore.value,
                        time: comp.date || '',
                      }}
                      onApprove={onApprove}
                      onReject={onReject}
                    />
                  </div>
                );
              })}
            </div>
          )}
          {pendingCustom.length > 0 && (
            <div className="slide-up space-y-3">
              <div className="mono-up text-ink-500 px-1">"Other" entries</div>
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
        </>
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
    <div className="glass-strong rounded-3xl p-5 slide-up border border-ink-200" style={{ animationDelay: `${animationDelay}s`, '--u': kid.color, borderLeft: `4px solid ${kid.color}` }}>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0" style={{ background: 'var(--u-tint)' }}>{kid.avatar}</div>
        <div className="flex-1">
          <div className="font-black text-ink-900">{kid.name}</div>
          <div className="mono-up text-ink-500 mt-0.5">"Other" entry</div>
        </div>
        <div className="text-3xl">{custom.icon || '✨'}</div>
      </div>
      <div className="bg-[color:var(--u-tint)] rounded-2xl p-4 mb-4">
        <div className="font-bold text-ink-900">{custom.title}</div>
        <div className="mono text-[11px] text-ink-500 mt-1">Submitted {custom.date}</div>
      </div>

      <div className="mb-4">
        <label className="mono-up text-ink-500 mb-2 block">How much is it worth?</label>
        <div className="flex gap-2 mb-2">
          {QUICK_PICKS.map(amt => {
            const selected = value === amt.toFixed(2);
            return (
              <PillButton
                key={amt}
                kind={selected ? 'primary' : 'glass'}
                size="sm"
                className="flex-1"
                onClick={() => setValue(String(amt.toFixed(2)))}
              >
                <span className="mono">${amt}</span>
              </PillButton>
            );
          })}
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 mono text-ink-500 font-extrabold">$</span>
          <input
            type="number" min="0" step="0.25" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Custom amount"
            className="w-full pl-7 pr-4 py-3 rounded-2xl bg-ink-50 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)] text-ink-900 mono font-semibold"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <PillButton kind="ghost" className="flex-1" onClick={onReject}>
          <X size={18} strokeWidth={3} /> Reject
        </PillButton>
        <PillButton
          kind="primary"
          className="flex-1"
          onClick={() => canApprove && onApprove(numeric)}
          disabled={!canApprove}
        >
          <Check size={18} strokeWidth={3} /> Approve
        </PillButton>
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
        <h2 className="display-font text-3xl font-black text-white">History</h2>
        <div className="glass-strong rounded-3xl p-12 text-center">
          <div className="text-5xl mb-3">🤷</div>
          <div className="font-bold text-ink-900">No one to show</div>
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
        <h2 className="display-font text-3xl md:text-4xl font-black text-white">History</h2>
        <p className="text-ink-300 font-semibold mt-1">Past chores and allowance</p>
      </div>

      {isParent && kidsToShow.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 slide-up no-scrollbar">
          {kidsToShow.map(kid => {
            const selected = selectedKidId === kid.id;
            return (
              <button key={kid.id} onClick={() => setSelectedKidId(kid.id)}
                style={{ '--u': kid.color, ...(selected && { background: 'var(--u)' }) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-bold transition flex-shrink-0 ${selected ? 'text-white shadow-glow' : 'glass text-ink-200 hover:bg-white/15'}`}>
                <span className="text-xl">{kid.avatar}</span>{kid.name}
              </button>
            );
          })}
        </div>
      )}

      <div className="glass-strong rounded-3xl p-6 slide-up" style={{ '--u': selectedKid.color }}>
        <div className="mono-up text-ink-500 mb-4">Last 4 weeks</div>
        <div className="flex items-end justify-between gap-3 h-40">
          {weeks.map((w, i) => {
            const offset = 3 - i;
            const isSelected = offset === weekOffset;
            const heightPct = maxEarn > 0 ? (w.total / maxEarn) * 100 : 0;
            return (
              <button key={offset} onClick={() => setWeekOffset(offset)} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="mono font-extrabold text-xs text-ink-700">${w.total.toFixed(0)}</div>
                <div className="w-full bg-ink-50 rounded-t-xl flex-1 flex items-end overflow-hidden">
                  <div className="w-full rounded-t-xl transition-all duration-500"
                    style={{ height: `${heightPct}%`, background: isSelected ? 'var(--u)' : 'color-mix(in oklab, var(--u) 38%, white)', minHeight: w.total > 0 ? '8px' : '0' }} />
                </div>
                <div className={`text-xs font-bold ${isSelected ? 'text-ink-900' : 'text-ink-500'}`}>{offset === 0 ? 'This' : offset === 1 ? 'Last' : `-${offset}w`}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="glass-strong rounded-3xl p-6 slide-up" style={{ '--u': selectedKid.color }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <div className="mono-up text-ink-500">{weekData.weekLabel}</div>
            <div className="mono font-extrabold text-3xl text-ink-900 mt-1">${weekData.total.toFixed(2)}</div>
          </div>
          {weekData.allDone && (
            <Tag tone="ok" className="!text-sm"><Trophy size={16} /> Perfect week!</Tag>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-paper rounded-2xl p-3">
            <div className="mono-up text-ink-500">Chores</div>
            <div className="mono font-extrabold text-xl text-ink-900 mt-1">${weekData.choreEarnings.toFixed(2)}</div>
          </div>
          <div className="bg-[color:var(--u-tint)] rounded-2xl p-3">
            <div className="mono-up text-[color:var(--u)]">Extras</div>
            <div className="mono font-extrabold text-xl text-ink-900 mt-1">${(weekData.extraEarnings || 0).toFixed(2)}</div>
          </div>
          <div className="bg-paper rounded-2xl p-3">
            <div className="mono-up text-ink-500">Bonus</div>
            <div className={`mono font-extrabold text-xl mt-1 ${weekData.bonus > 0 ? 'text-emerald-600' : 'text-ink-500'}`}>${weekData.bonus.toFixed(2)}</div>
          </div>
        </div>

        <div className="mono-up text-ink-500 mb-3">Chores Completed</div>
        {weekData.completions.length === 0 ? (
          <div className="text-center py-6 text-ink-500 font-semibold">No chores completed this week</div>
        ) : (
          <div className="space-y-2">
            {weekData.completions.map(comp => {
              const chore = family.chores.find(c => c.id === comp.choreId);
              if (!chore) return null;
              const isExtra = chore.assignedTo === null || chore.assignedTo === undefined;
              const compDate = new Date(comp.date);
              return (
                <div key={comp.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isExtra ? 'bg-[color:var(--u-tint)]' : 'bg-paper'}`}>
                  <div className="text-2xl">{chore.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-900 flex items-center gap-2 flex-wrap">
                      {chore.title}
                      {isExtra && <Tag tone="brand"><Sparkles size={9} /> EXTRA</Tag>}
                    </div>
                    <div className="mono text-[11px] text-ink-500 font-semibold mt-0.5">
                      {compDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div className="mono font-extrabold text-emerald-600">+${chore.value.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}

        {weekCustoms.length > 0 && (
          <>
            <div className="mono-up text-ink-500 mb-3 mt-5">"Other" Entries</div>
            <div className="space-y-2">
              {weekCustoms.map(cc => {
                const compDate = new Date(cc.date);
                const isApproved = cc.status === 'approved';
                const isRejected = cc.status === 'rejected';
                const isPending = cc.status === 'pending';
                return (
                  <div key={cc.id} className={`flex items-center gap-3 p-3 rounded-2xl ${isApproved ? 'bg-[color:var(--u-tint)]' : isRejected ? 'bg-red-50' : 'bg-paper'}`}>
                    <div className={`text-2xl ${isRejected ? 'opacity-40' : ''}`}>{cc.icon || '✨'}</div>
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold flex items-center gap-2 flex-wrap ${isRejected ? 'text-ink-500 line-through' : 'text-ink-900'}`}>
                        {cc.title}
                        {isApproved && <Tag tone="brand">OTHER</Tag>}
                        {isPending && <Tag tone="warn">PENDING</Tag>}
                        {isRejected && <Tag tone="bad">REJECTED</Tag>}
                      </div>
                      <div className="mono text-[11px] text-ink-500 font-semibold">
                        {compDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isApproved && <div className="mono font-extrabold text-emerald-600">+${(cc.value || 0).toFixed(2)}</div>}
                      {isPending && <div className="mono text-xs font-bold text-ink-500">$—</div>}
                      {isRejected && <div className="mono text-xs font-bold text-red-400">$0</div>}
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
        <h2 className="display-font text-3xl md:text-4xl font-black text-white">Manage</h2>
        <p className="text-ink-300 font-semibold mt-1">Family, chores, and settings</p>
      </div>

      {/* Parents */}
      <div className="glass-strong rounded-3xl p-5 slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="mono-up text-ink-500">Parents</div>
          <PillButton kind="soft" size="sm" onClick={() => setShowAddParent(true)}><Plus size={16} strokeWidth={3} /> Add</PillButton>
        </div>
        <div className="space-y-2">
          {family.parents.map(p => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-2xl bg-paper" style={{ '--u': p.color || '#FFC233' }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--u-tint)' }}>{p.avatar}</div>
              <div className="flex-1">
                <div className="font-black text-ink-900">{p.name}</div>
                <div className="mono-up text-ink-500 mt-0.5">
                  {p.id === currentUser.id ? 'Signed in' : 'Parent'}
                </div>
              </div>
              <button onClick={() => setEditingParent(p)}
                      className="w-10 h-10 rounded-xl hover:bg-[color:var(--u-tint)] text-ink-500 hover:text-[color:var(--u)] flex items-center justify-center transition"
                      aria-label={`Edit ${p.name}`}>
                <Pencil size={17} />
              </button>
              {p.id === currentUser.id && (
                <PillButton kind="ghost" size="sm" onClick={() => setShowChangePin(true)}>Change PIN</PillButton>
              )}
              {family.parents.length > 1 && p.id !== currentUser.id && (
                <button onClick={() => setConfirmDelete({ type: 'parent', id: p.id, name: p.name })}
                        className="w-10 h-10 rounded-xl hover:bg-red-50 text-ink-500 hover:text-red-600 flex items-center justify-center transition">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Kids */}
      <div className="glass-strong rounded-3xl p-5 slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="mono-up text-ink-500">Kids</div>
          <PillButton kind="soft" size="sm" onClick={() => setShowAddKid(true)}><Plus size={16} strokeWidth={3} /> Add</PillButton>
        </div>
        <div className="space-y-2">
          {family.kids.length === 0 && <div className="text-center py-6 text-ink-500 font-semibold">No kids yet</div>}
          {family.kids.map(kid => (
            <div key={kid.id} className="flex items-center gap-3 p-3 rounded-2xl bg-paper" style={{ '--u': kid.color }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'var(--u-tint)' }}>{kid.avatar}</div>
              <div className="flex-1">
                <div className="font-black text-ink-900">{kid.name}</div>
                <div className="text-xs text-ink-500 font-semibold mt-0.5">Age <span className="mono font-bold">{kid.age}</span> · <span className="mono font-bold">${kid.weeklyAllowance}</span>/week bonus</div>
              </div>
              <button onClick={() => setEditingKid(kid)}
                      className="w-10 h-10 rounded-xl hover:bg-[color:var(--u-tint)] text-ink-500 hover:text-[color:var(--u)] flex items-center justify-center transition"
                      aria-label={`Edit ${kid.name}`}>
                <Pencil size={17} />
              </button>
              <button onClick={() => setConfirmDelete({ type: 'kid', id: kid.id, name: kid.name })}
                      className="w-10 h-10 rounded-xl hover:bg-red-50 text-ink-500 hover:text-red-600 flex items-center justify-center transition"
                      aria-label={`Remove ${kid.name}`}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chores */}
      <div className="glass-strong rounded-3xl p-5 slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="mono-up text-ink-500">Chores</div>
          <PillButton kind="soft" size="sm" onClick={() => setShowAddChore(true)}><Plus size={16} strokeWidth={3} /> Add</PillButton>
        </div>
        <div className="space-y-3">
          {family.chores.length === 0 && <div className="text-center py-6 text-ink-500 font-semibold">No chores yet</div>}
          {family.kids.map(kid => {
            const kidChores = family.chores.filter(c => c.assignedTo === kid.id);
            if (kidChores.length === 0) return null;
            return (
              <div key={kid.id}>
                <div className="text-xs font-bold text-ink-500 px-2 mb-1 flex items-center gap-1">
                  <span>{kid.avatar}</span> {kid.name}'s chores
                </div>
                <div className="space-y-1.5">
                  {kidChores.map(chore => (
                    <div key={chore.id} className="flex items-center gap-3 p-3 rounded-2xl bg-paper" style={{ '--u': kid.color }}>
                      <div className="text-2xl">{chore.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-ink-900 flex items-center gap-2 flex-wrap">
                          {chore.title}
                          {chore.isRequiredForExtras && (
                            <Tag tone="brand"><Lock size={8} /> REQUIRED</Tag>
                          )}
                        </div>
                        <div className="mono text-[11px] text-ink-500 font-semibold mt-0.5">${chore.value.toFixed(2)} · {chore.frequency}</div>
                      </div>
                      <button onClick={() => setEditingChore(chore)}
                              className="w-10 h-10 rounded-xl hover:bg-[color:var(--u-tint)] text-ink-500 hover:text-[color:var(--u)] flex items-center justify-center transition">
                        <Pencil size={17} />
                      </button>
                      <button onClick={() => setConfirmDelete({ type: 'chore', id: chore.id, name: chore.title })}
                              className="w-10 h-10 rounded-xl hover:bg-red-50 text-ink-500 hover:text-red-600 flex items-center justify-center transition">
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
              <div className="mono-up text-[color:var(--u)] px-2 mb-1 flex items-center gap-1">
                <Sparkles size={14} /> Extra Chores (shared)
              </div>
              <div className="space-y-1.5">
                {family.chores.filter(c => c.assignedTo === null || c.assignedTo === undefined).map(chore => (
                  <div key={chore.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[color:var(--u-tint)]">
                    <div className="text-2xl">{chore.icon}</div>
                    <div className="flex-1">
                      <div className="font-bold text-ink-900">{chore.title}</div>
                      <div className="mono text-[11px] text-ink-500 font-semibold mt-0.5">${chore.value.toFixed(2)} · {chore.frequency} · {(chore.maxClaimers || 1) === 1 ? 'one kid claims' : `up to ${chore.maxClaimers} kids`}</div>
                    </div>
                    <button onClick={() => setEditingChore(chore)}
                            className="w-10 h-10 rounded-xl hover:bg-[color:var(--u-tint)] text-ink-500 hover:text-ink-900 flex items-center justify-center transition">
                      <Pencil size={17} />
                    </button>
                    <button onClick={() => setConfirmDelete({ type: 'chore', id: chore.id, name: chore.title })}
                            className="w-10 h-10 rounded-xl hover:bg-red-50 text-ink-500 hover:text-red-600 flex items-center justify-center transition">
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
      <div className="glass-strong rounded-3xl p-5 slide-up">
        <div className="mono-up text-ink-500 mb-4 flex items-center gap-1">
          <Target size={12} /> Savings Goals
        </div>
        {family.kids.length === 0 ? (
          <div className="text-center py-6 text-ink-500 font-semibold">Add a kid first</div>
        ) : (
          <div className="space-y-4">
            {family.kids.map(kid => {
              const kidGoals = (family.goals || []).filter(g => g.kidId === kid.id);
              return (
                <div key={kid.id}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-bold text-ink-500 flex items-center gap-1 px-1">
                      <span>{kid.avatar}</span> {kid.name}'s goals
                    </div>
                    <PillButton kind="soft" size="sm" onClick={() => setAddingGoalFor(kid)} style={{ '--u': kid.color }}>
                      <Plus size={12} strokeWidth={3} /> Add
                    </PillButton>
                  </div>
                  {kidGoals.length === 0 ? (
                    <div className="text-xs text-ink-500 font-semibold px-2 py-2">No goals yet</div>
                  ) : (
                    <div className="space-y-1.5">
                      {kidGoals.map(goal => (
                        <div key={goal.id} className="flex items-center gap-3 p-3 rounded-2xl bg-paper" style={{ '--u': kid.color }}>
                          <div className="text-2xl">{goal.icon}</div>
                          <div className="flex-1">
                            <div className="font-bold text-ink-900">{goal.title}</div>
                            <div className="mono text-[11px] text-ink-500 font-semibold mt-0.5">Target: ${goal.target.toFixed(2)}</div>
                          </div>
                          <button onClick={() => setConfirmDelete({ type: 'goal', id: goal.id, name: goal.title })}
                                  className="w-10 h-10 rounded-xl hover:bg-red-50 text-ink-500 hover:text-red-600 flex items-center justify-center transition">
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
        <div className="glass-strong rounded-3xl p-5 slide-up">
          <div className="mono-up text-ink-500 mb-4 flex items-center gap-1">
            <DollarSign size={12} /> Recent Payouts
          </div>
          <div className="space-y-2">
            {(family.payouts || []).slice(0, 10).map(payout => {
              const kid = family.kids.find(k => k.id === payout.kidId);
              if (!kid) return null;
              const d = new Date(payout.date);
              return (
                <div key={payout.id} className="flex items-center gap-3 p-3 rounded-2xl bg-paper" style={{ '--u': kid.color }}>
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: 'var(--u-tint)' }}>{kid.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-ink-900">{kid.name}</div>
                    <div className="mono text-[11px] text-ink-500 font-semibold mt-0.5">
                      {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {payout.note && <span> · {payout.note}</span>}
                    </div>
                  </div>
                  <div className="mono font-extrabold text-emerald-600">${payout.amount.toFixed(2)}</div>
                  <button onClick={() => setConfirmDelete({ type: 'payout', id: payout.id, name: `$${payout.amount.toFixed(2)} payout to ${kid.name}` })}
                          className="w-8 h-8 rounded-lg hover:bg-red-50 text-ink-300 hover:text-red-600 flex items-center justify-center transition">
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
    <div className="fixed inset-0 bg-ink-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-t-3xl md:rounded-3xl p-6 w-full md:max-w-md shadow-2xl max-h-[90vh] overflow-y-auto pop-in"
           onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="display-font text-2xl font-black text-ink-900">{title}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-ink-50 flex items-center justify-center transition"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AddChoreModal({ kids, onAdd, onClose }) {
  const [title, setTitle] = useState('');
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
        <div className="grid grid-cols-2 gap-2 p-1 bg-ink-50 rounded-2xl">
          <button type="button" onClick={() => setMode('assigned')}
                  className={`py-2.5 rounded-xl text-sm font-bold transition ${mode === 'assigned' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}>
            Assigned
          </button>
          <button type="button" onClick={() => setMode('extra')}
                  className={`py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1 ${mode === 'extra' ? 'bg-white text-[color:var(--u)] shadow-sm' : 'text-ink-500'}`}>
            <Sparkles size={14} /> Extra Chore
          </button>
        </div>
        <div className="text-xs font-semibold text-ink-500 -mt-2 px-1">
          {mode === 'assigned'
            ? 'Goes to specific kids. Each gets their own copy.'
            : 'Shared across all kids — whoever does it first earns the money.'}
        </div>

        <Field label="Name">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Feed the cat" autoFocus
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <Field label="Icon">
          <div className="grid grid-cols-7 gap-2 max-h-52 overflow-y-auto p-2 bg-paper rounded-2xl">
            {DEDUPED_EMOJI_OPTIONS.map(e => (
              <button key={e} type="button" onClick={() => setIcon(e)}
                      className={`text-2xl p-2 rounded-xl transition ${icon === e ? 'bg-[color:var(--u-tint)] scale-110' : 'hover:bg-ink-100'}`}>{e}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value ($)">
            <input type="number" step="0.25" min="0" value={value} onChange={(e) => setValue(e.target.value)}
                   className="w-full bg-ink-50 rounded-2xl px-4 py-3 mono font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
          <Field label={mode === 'extra' ? 'Resets' : 'How often'}>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]">
              {CADENCE_OPTIONS.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
        </div>

        {mode === 'assigned' ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="mono-up text-ink-500">
                Assign to {assignedToIds.length > 0 && <span className="text-[color:var(--u)]">({assignedToIds.length})</span>}
              </label>
              {kids.length > 1 && (
                <button type="button" onClick={allSelected ? clearAll : selectAll}
                        className="text-xs font-black text-[color:var(--u)] hover:text-[color:var(--u)] transition">
                  {allSelected ? 'Clear all' : 'Select all'}
                </button>
              )}
            </div>
            {kids.length === 0 ? (
              <div className="text-sm text-ink-500 p-4 bg-paper rounded-2xl text-center">
                Add a kid first, or switch to Extra Chore above.
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {kids.map(kid => {
                  const selected = assignedToIds.includes(kid.id);
                  return (
                    <button key={kid.id} type="button" onClick={() => toggleKid(kid.id)}
                            style={{ '--u': kid.color, borderColor: selected ? 'var(--u)' : 'transparent' }}
                            className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl font-bold transition border-2 ${selected ? 'bg-white shadow-md' : 'bg-ink-50 hover:bg-ink-100 opacity-60'}`}>
                      {selected && (
                        <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                             style={{ background: 'var(--u)' }}>
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
              <div className="text-xs text-ink-500 font-semibold mt-2 px-1">
                {assignedToIds.length === 1 ? 'A chore will be added for this kid' :
                 `A separate copy will be added for each of the ${assignedToIds.length} selected kids`}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[color:var(--u-tint)] rounded-2xl p-4 flex gap-3">
            <Sparkles size={20} className="text-[color:var(--u)] flex-shrink-0 mt-0.5" />
            <div className="text-sm font-semibold text-ink-700">
              This chore will appear on every kid's dashboard. The first {maxClaimers > 1 ? `${maxClaimers} kids` : 'kid'} to check it off {maxClaimers > 1 ? 'claim' : 'claims'} the earnings, and it won't show up {maxClaimers > 1 ? 'for them' : ''} again until it resets.
            </div>
          </div>
        )}

        {mode === 'extra' && (
          <Field label="How many kids can claim this?">
            <div className="flex items-center gap-3 bg-paper rounded-2xl p-3 border-2 border-ink-200">
              <button type="button"
                      onClick={() => setMaxClaimers(Math.max(1, maxClaimers - 1))}
                      disabled={maxClaimers <= 1}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm font-black text-lg disabled:opacity-40 hover:bg-ink-50 transition">−</button>
              <div className="flex-1 text-center">
                <div className="mono font-extrabold text-2xl text-ink-900">{maxClaimers}</div>
                <div className="mono-up text-ink-500">
                  {maxClaimers === 1 ? 'one kid · first wins' : `up to ${maxClaimers} kids can claim`}
                </div>
              </div>
              <button type="button"
                      onClick={() => setMaxClaimers(Math.min(Math.max(1, kids.length), maxClaimers + 1))}
                      disabled={maxClaimers >= Math.max(1, kids.length)}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm font-black text-lg disabled:opacity-40 hover:bg-ink-50 transition">+</button>
            </div>
            <div className="text-[11px] text-ink-500 font-semibold mt-2 px-1">
              Example: "Unload dishwasher" = 1 kid, "Pull weeds" = 3 kids.
            </div>
          </Field>
        )}

        {mode === 'assigned' && (
          <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${isRequiredForExtras ? 'bg-[color:var(--u-tint)] border-[color:var(--u)]' : 'bg-paper border-ink-200 hover:border-ink-200'}`}>
            <input type="checkbox" checked={isRequiredForExtras}
                   onChange={(e) => setIsRequiredForExtras(e.target.checked)}
                   className="mt-0.5 w-5 h-5 rounded accent-[color:var(--u)] cursor-pointer flex-shrink-0" />
            <div className="flex-1">
              <div className="font-black text-sm text-ink-900 flex items-center gap-1">
                <Lock size={12} /> Required for Extra Chores
              </div>
              <div className="text-xs font-semibold text-ink-700 mt-1">
                Required chores gate access to Extra Chores. A kid unlocks Extras if they finished all required chores last week OR finish them this week.
              </div>
            </div>
          </label>
        )}

        <PillButton kind="primary" size="lg" disabled={!canSubmit}
                onClick={() => onAdd({
                  title: title.trim(),
                  value: parseFloat(value),
                  icon,
                  frequency,
                  isRequiredForExtras: mode === 'assigned' ? isRequiredForExtras : false,
                  ...(mode === 'extra' ? { isExtra: true, maxClaimers } : { assignedToIds }),
                })}
                className="w-full">
          {mode === 'extra' ? 'Add extra chore' :
           assignedToIds.length > 1 ? `Add chore to ${assignedToIds.length} kids` : 'Add chore'}
        </PillButton>
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
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-paper rounded-2xl">
            {DEDUPED_KID_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'bg-[color:var(--u-tint)] scale-110' : 'hover:bg-ink-100'}`}>{a}</button>
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
                   className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
          <Field label="Weekly bonus ($)">
            <input type="number" step="0.5" min="0" value={weeklyAllowance} onChange={(e) => setWeeklyAllowance(e.target.value)}
                   className="w-full bg-ink-50 rounded-2xl px-4 py-3 mono font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
        </div>
        <PillButton kind="primary" size="lg" disabled={!canSubmit}
                onClick={() => onSave({ name: name.trim(), avatar, color, age: parseInt(age), weeklyAllowance: parseFloat(weeklyAllowance) || 0 })}
                className="w-full">
          Save changes
        </PillButton>
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
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-paper rounded-2xl">
            {DEDUPED_KID_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'bg-[color:var(--u-tint)] scale-110' : 'hover:bg-ink-100'}`}>{a}</button>
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
                   className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
          <Field label="Weekly bonus ($)">
            <input type="number" step="0.5" min="0" value={weeklyAllowance} onChange={(e) => setWeeklyAllowance(e.target.value)}
                   className="w-full bg-ink-50 rounded-2xl px-4 py-3 mono font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
        </div>
        <PillButton kind="primary" size="lg" disabled={!canSubmit} onClick={() => onAdd({ name: name.trim(), age: parseInt(age), avatar, color, weeklyAllowance: parseFloat(weeklyAllowance) || 0 })}
                className="w-full">
          Add kid
        </PillButton>
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
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-paper rounded-2xl">
            {DEDUPED_PARENT_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'bg-[color:var(--u-tint)] scale-110' : 'hover:bg-ink-100'}`}>{a}</button>
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
                 className="w-full text-center text-2xl mono font-extrabold tracking-[0.5em] bg-ink-50 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <PillButton kind="primary" size="lg" disabled={!canSubmit} onClick={() => onAdd({ name: name.trim(), avatar, pin, color })}
                className="w-full">
          Add parent
        </PillButton>
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
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <Field label="Avatar">
          <div className="grid grid-cols-6 gap-2 max-h-52 overflow-y-auto p-2 bg-paper rounded-2xl">
            {DEDUPED_PARENT_AVATARS.map(a => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                      style={{ '--u': color, ...(avatar === a && { background: 'color-mix(in oklab, var(--u) 25%, white)' }) }}
                      className={`text-3xl p-2 rounded-xl transition ${avatar === a ? 'scale-110' : 'hover:bg-ink-100'}`}>{a}</button>
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
        <PillButton kind="primary" size="lg" disabled={!canSubmit} onClick={() => onSave({ name: name.trim(), avatar, color })}
                className="w-full">
          Save changes
        </PillButton>
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
          <div className="font-black text-ink-900">PIN updated!</div>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Current PIN">
            <input type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••" autoFocus
                   className="w-full text-center text-2xl mono font-extrabold tracking-[0.5em] bg-ink-50 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
          <Field label="New PIN">
            <input type="password" inputMode="numeric" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="••••"
                   className="w-full text-center text-2xl mono font-extrabold tracking-[0.5em] bg-ink-50 rounded-2xl px-4 py-3 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
          {error && <div className="text-sm font-bold text-red-600 bg-red-50 rounded-xl p-3">{error}</div>}
          <PillButton kind="primary" size="lg" className="w-full" disabled={!canSubmit} onClick={submit}>
            Update PIN
          </PillButton>
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
        className="mono-up text-ink-700 bg-ink-50 hover:bg-ink-100 border border-ink-200 px-2 py-1 rounded-full transition whitespace-nowrap">
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
      <div className="space-y-4" style={{ '--u': kid?.color || '#FFC233' }}>
        <div className="bg-[color:var(--u-tint)] rounded-2xl p-3 text-xs font-semibold text-ink-700">
          This will create a new chore based on "{cc.title}". The original "Other" entry stays in History.
        </div>

        <div>
          <label className="mono-up text-ink-500 mb-1 block">Chore name</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60}
            className="w-full px-4 py-3 rounded-2xl bg-ink-50 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)] text-ink-900 font-semibold" />
        </div>

        <div>
          <label className="mono-up text-ink-500 mb-2 block">Chore type</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('required')}
              className={`py-3 rounded-2xl font-bold text-sm transition border-2 ${mode === 'required' ? 'bg-ink-900 text-white border-ink-900' : 'bg-ink-50 text-ink-700 border-transparent hover:bg-ink-100'}`}>
              🔒 Required chore
            </button>
            <button onClick={() => setMode('extra')}
              className={`py-3 rounded-2xl font-bold text-sm transition border-2 ${mode === 'extra' ? 'bg-[color:var(--u)] text-white border-[color:var(--u)]' : 'bg-ink-50 text-ink-700 border-transparent hover:bg-ink-100'}`}>
              ⭐ Extra chore
            </button>
          </div>
          <div className="text-xs text-ink-500 font-semibold mt-1">
            {mode === 'required' ? 'Assigned to a specific kid and counts toward their bonus.' : 'Anyone in the family can claim this for extra cash.'}
          </div>
        </div>

        {mode === 'required' && family.kids.length > 1 && (
          <div>
            <label className="mono-up text-ink-500 mb-2 block">Assign to</label>
            <div className="flex gap-2 flex-wrap">
              {family.kids.map(k => (
                <button key={k.id} onClick={() => setAssignedTo(k.id)}
                  style={{ '--u': k.color }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-2xl font-bold text-sm transition border-2 ${assignedTo === k.id ? 'border-[color:var(--u)] bg-[color:var(--u-tint)]' : 'border-ink-200 hover:border-ink-300 bg-white'}`}>
                  <span>{k.avatar}</span><span>{k.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="mono-up text-ink-500 mb-2 block">Frequency</label>
          <div className="grid grid-cols-2 gap-2">
            {CADENCE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setFrequency(opt.value)}
                className={`py-2 rounded-xl font-black text-sm transition ${frequency === opt.value ? 'bg-ink-900 text-white' : 'bg-ink-50 text-ink-700 hover:bg-ink-100'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mono-up text-ink-500 mb-1 block">Dollar value</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 mono text-ink-500 font-extrabold">$</span>
            <input type="number" min="0" step="0.25" value={value} onChange={(e) => setValue(e.target.value)}
              className="w-full pl-7 pr-4 py-3 rounded-2xl bg-ink-50 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)] text-ink-900 mono font-semibold" />
          </div>
        </div>

        <PillButton kind="primary" size="lg" className="w-full" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Saving…' : 'Create chore'}
        </PillButton>
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
            style={{ '--u': kid.color }}
            className="flex flex-col items-center gap-2 p-4 rounded-2xl border-2 border-ink-200 hover:border-[color:var(--u)] hover:bg-[color:var(--u-tint)] transition">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--u-tint)' }}>{kid.avatar}</div>
            <div className="font-black text-ink-900">{kid.name}</div>
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
      <div className="space-y-4" style={{ '--u': kid.color }}>
        <div className="bg-[color:var(--u-tint)] rounded-2xl p-3 text-xs font-semibold text-ink-700">
          {isParent
            ? 'Log something this kid did. Set the dollar value and it\'ll be added right away.'
            : 'Describe what you did. Your parent will check it and decide how much it\'s worth.'}
        </div>

        <div>
          <label className="mono-up text-ink-500 mb-1 block">What was it?</label>
          <input
            type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={60}
            placeholder="e.g. Helped unload groceries"
            className="w-full px-4 py-3 rounded-2xl bg-ink-50 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)] text-ink-900 font-semibold"
          />
        </div>

        <div>
          <label className="mono-up text-ink-500 mb-2 block">Pick an icon</label>
          <div className="grid grid-cols-6 gap-2">
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)}
                className={`aspect-square rounded-2xl text-2xl flex items-center justify-center transition ${icon === ic ? 'bg-[color:var(--u-tint)] ring-2 ring-[color:var(--u)]' : 'bg-ink-50 hover:bg-ink-100'}`}>
                {ic}
              </button>
            ))}
          </div>
        </div>

        {isParent && (
          <div>
            <label className="mono-up text-ink-500 mb-2 block">How much is it worth?</label>
            <div className="flex gap-2 mb-2">
              {QUICK_PICKS.map(amt => {
                const selected = value === amt.toFixed(2);
                return (
                  <PillButton key={amt} kind={selected ? 'primary' : 'glass'} size="sm" className="flex-1" onClick={() => setValue(String(amt.toFixed(2)))}>
                    <span className="mono">${amt}</span>
                  </PillButton>
                );
              })}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 mono text-ink-500 font-extrabold">$</span>
              <input
                type="number" min="0" step="0.25" value={value} onChange={(e) => setValue(e.target.value)}
                placeholder="Custom amount"
                className="w-full pl-7 pr-4 py-3 rounded-2xl bg-ink-50 outline-none focus:ring-4 focus:ring-[color:var(--u-tint)] text-ink-900 font-semibold"
              />
            </div>
          </div>
        )}

        <PillButton kind="primary" size="lg" onClick={() => canSubmit && onSubmit({ title: trimmed, icon, value: isParent ? numericValue : 0 })} disabled={!canSubmit}
          className="w-full">
          {isParent ? 'Add it' : 'Send for approval'}
        </PillButton>
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
      <div className="space-y-4" style={{ '--u': kid.color }}>
        <div className="bg-emerald-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'var(--u-tint)' }}>{kid.avatar}</div>
          <div className="flex-1">
            <div className="mono-up text-ink-500">Unpaid balance</div>
            <div className="mono font-extrabold text-2xl text-emerald-700">${currentBalance.toFixed(2)}</div>
          </div>
        </div>

        <Field label="Amount to pay out">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 mono text-ink-500 font-extrabold">$</div>
            <input type="number" step="0.25" min="0" max={currentBalance} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus
                   className="w-full bg-ink-50 rounded-2xl pl-8 pr-4 py-3 mono font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </div>
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setAmount(currentBalance.toFixed(2))}
                    className="flex-1 py-2 rounded-xl bg-emerald-100 text-emerald-800 mono text-xs font-extrabold hover:bg-emerald-200 transition">
              Pay all ${currentBalance.toFixed(2)}
            </button>
            <button type="button" onClick={() => setAmount((currentBalance / 2).toFixed(2))}
                    className="flex-1 py-2 rounded-xl bg-ink-50 text-ink-700 mono text-xs font-extrabold hover:bg-ink-100 transition">
              Half
            </button>
          </div>
        </Field>

        <Field label="Payment method">
          <div className="flex gap-2 mb-2">
            {NOTE_PICKS.map(pick => {
              const selected = note === pick;
              return (
                <button key={pick} type="button" onClick={() => setNote(pick)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${selected ? 'bg-emerald-500 text-white' : 'bg-ink-50 text-ink-700 hover:bg-ink-100'}`}>
                  {pick}
                </button>
              );
            })}
          </div>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Or type a custom note"
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>

        {!isNaN(amt) && amt > 0 && amt <= currentBalance && (
          <div className="bg-paper rounded-2xl p-3 text-xs font-bold text-ink-700">
            After payout: <span className="mono font-extrabold text-ink-900">${(currentBalance - amt).toFixed(2)}</span> will remain in {kid.name}'s balance.
          </div>
        )}

        <PillButton size="lg" className="w-full !bg-emerald-500 !text-white !shadow-none" disabled={!canSubmit} onClick={() => onConfirm(amt, note)}>
          Pay out <span className="mono font-extrabold">${!isNaN(amt) ? amt.toFixed(2) : '0.00'}</span>
        </PillButton>
      </div>
    </ModalShell>
  );
}

function EditChoreModal({ chore, kids, onSave, onClose }) {
  const [title, setTitle] = useState(chore.title);
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
        <div className="grid grid-cols-2 gap-2 p-1 bg-ink-50 rounded-2xl">
          <button type="button" onClick={() => setMode('assigned')}
                  className={`py-2.5 rounded-xl text-sm font-bold transition ${mode === 'assigned' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}>
            Assigned
          </button>
          <button type="button" onClick={() => setMode('extra')}
                  className={`py-2.5 rounded-xl text-sm font-bold transition flex items-center justify-center gap-1 ${mode === 'extra' ? 'bg-white text-[color:var(--u)] shadow-sm' : 'text-ink-500'}`}>
            <Sparkles size={14} /> Extra
          </button>
        </div>

        <Field label="Name">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <Field label="Icon">
          <div className="grid grid-cols-7 gap-2 max-h-52 overflow-y-auto p-2 bg-paper rounded-2xl">
            {DEDUPED_EMOJI_OPTIONS.map(e => (
              <button key={e} type="button" onClick={() => setIcon(e)}
                      className={`text-2xl p-2 rounded-xl transition ${icon === e ? 'bg-[color:var(--u-tint)] scale-110' : 'hover:bg-ink-100'}`}>{e}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Value ($)">
            <input type="number" step="0.25" min="0" value={value} onChange={(e) => setValue(e.target.value)}
                   className="w-full bg-ink-50 rounded-2xl px-4 py-3 mono font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </Field>
          <Field label="How often">
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                    className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]">
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
                        style={{ '--u': kid.color, borderColor: assignedTo === kid.id ? 'var(--u)' : 'transparent' }}
                        className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl font-bold transition border-2 ${assignedTo === kid.id ? 'bg-white shadow-md' : 'bg-ink-50 hover:bg-ink-100 opacity-60'}`}>
                  <div className="text-2xl">{kid.avatar}</div>
                  <div className="text-sm">{kid.name}</div>
                </button>
              ))}
            </div>
          </Field>
        )}

        {mode === 'assigned' && (
          <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition ${isRequiredForExtras ? 'bg-[color:var(--u-tint)] border-[color:var(--u)]' : 'bg-paper border-ink-200 hover:border-ink-200'}`}>
            <input type="checkbox" checked={isRequiredForExtras}
                   onChange={(e) => setIsRequiredForExtras(e.target.checked)}
                   className="mt-0.5 w-5 h-5 rounded accent-[color:var(--u)] cursor-pointer flex-shrink-0" />
            <div className="flex-1">
              <div className="font-black text-sm text-ink-900 flex items-center gap-1">
                <Lock size={12} /> Required for Extra Chores
              </div>
              <div className="text-xs font-semibold text-ink-700 mt-1">
                Required chores gate access to Extra Chores. A kid unlocks Extras if they finished all required chores last week OR finish them this week.
              </div>
            </div>
          </label>
        )}

        <PillButton kind="primary" size="lg" disabled={!canSubmit}
                onClick={() => onSave({
                  title: title.trim(),
                  value: parseFloat(value),
                  icon,
                  frequency,
                  assignedTo: mode === 'extra' ? null : assignedTo,
                  isRequiredForExtras: mode === 'assigned' ? isRequiredForExtras : false,
                  maxClaimers: mode === 'extra' ? maxClaimers : 1,
                })}
                className="w-full">
          Save changes
        </PillButton>
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
                 className="w-full bg-ink-50 rounded-2xl px-4 py-3 font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
        </Field>
        <Field label="Icon">
          <div className="grid grid-cols-6 gap-2">
            {ICONS.map(i => (
              <button key={i} type="button" onClick={() => setIcon(i)}
                      className={`text-3xl p-2 rounded-xl transition ${icon === i ? 'bg-[color:var(--u-tint)] scale-110' : 'bg-ink-50 hover:bg-ink-100'}`}>{i}</button>
            ))}
          </div>
        </Field>
        <Field label="Target amount">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 mono text-ink-500 font-extrabold">$</div>
            <input type="number" step="1" min="1" value={target} onChange={(e) => setTarget(e.target.value)}
                   className="w-full bg-ink-50 rounded-2xl pl-8 pr-4 py-3 mono font-semibold outline-none focus:ring-4 focus:ring-[color:var(--u-tint)]" />
          </div>
        </Field>
        <PillButton kind="primary" size="lg" disabled={!canSubmit} onClick={() => onAdd({ kidId: kid.id, title: title.trim(), icon, target: parseFloat(target) })}
                className="w-full">
          Add goal
        </PillButton>
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
          <PillButton kind="ghost" size="lg" className="flex-1" onClick={onCancel}>Cancel</PillButton>
          <PillButton kind="danger" size="lg" className="flex-1" onClick={onConfirm}>Delete</PillButton>
        </div>
      </div>
    </ModalShell>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mono-up text-ink-500 block mb-2">{label}</label>
      {children}
    </div>
  );
}

function NavButton({ icon, label, active, onClick, badge }) {
  return (
    <button onClick={onClick} className={`flex-1 flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all relative ${active ? 'text-[color:var(--u)]' : 'text-ink-300 hover:text-white'}`}>
      <div className="relative">
        {icon}
        {badge > 0 && <div className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center">{badge}</div>}
      </div>
      <div className={`text-[11px] font-black ${active ? 'text-[color:var(--u)]' : ''}`}>{label}</div>
      {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[color:var(--u)]" />}
    </button>
  );
}

function FullPageSpinner() {
  return (
    <div className="ambient-stage min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-[color:var(--u)] mx-auto mb-3" />
        <div className="font-black text-ink-700">Loading Chorely...</div>
      </div>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#0A0908' }}>
      <div className="glass-strong rounded-3xl p-8 max-w-md text-center">
        <div className="text-5xl mb-3">😬</div>
        <div className="font-black text-xl text-ink-900 mb-2">Connection problem</div>
        <div className="text-sm text-ink-500 mb-5">{message}</div>
        <PillButton kind="primary" size="lg" onClick={onRetry}>Try again</PillButton>
      </div>
    </div>
  );
}
