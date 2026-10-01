/* ===========================================================
   calc.js — formule (BMI, TDEE, macro, 1RM), database alimenti
   e template di schede di allenamento.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ACTIVITY_FACTORS = {
    sedentario: 1.2,
    leggero: 1.375,
    moderato: 1.55,
    intenso: 1.725,
    molto_intenso: 1.9,
  };

  const ACTIVITY_LABELS = {
    sedentario: "Sedentario (poco o nessun esercizio)",
    leggero: "Leggero (1-3 giorni/sett.)",
    moderato: "Moderato (3-5 giorni/sett.)",
    intenso: "Intenso (6-7 giorni/sett.)",
    molto_intenso: "Molto intenso (atleta / 2 volte al giorno)",
  };

  function bmi(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    const h = heightCm / 100;
    return weightKg / (h * h);
  }

  function bmiLabel(value) {
    if (value == null) return "";
    if (value < 18.5) return "Sottopeso";
    if (value < 25) return "Normopeso";
    if (value < 30) return "Sovrappeso";
    return "Obesità";
  }

  // Mifflin-St Jeor
  function bmr({ weight, height, age, sex }) {
    const base = 10 * weight + 6.25 * height - 5 * age;
    return sex === "f" ? base - 161 : base + 5;
  }

  function tdee(profile) {
    const b = bmr(profile);
    const factor = ACTIVITY_FACTORS[profile.activity] || 1.375;
    return Math.round(b * factor);
  }

  // Ritorna { kcal, protein, carbs, fat } in grammi/kcal coerenti con l'obiettivo
  function computeTargets(profile) {
    const maintenance = tdee(profile);
    let kcal = maintenance;
    let proteinPerKg = 1.8;
    if (profile.goal === "bulk") {
      kcal = Math.round(maintenance * 1.12);
      proteinPerKg = 1.8;
    } else if (profile.goal === "cut") {
      kcal = Math.round(maintenance * 0.82);
      proteinPerKg = 2.2;
    }
    const protein = Math.round(proteinPerKg * profile.weight);
    const fatKcal = kcal * 0.25;
    const fat = Math.round(fatKcal / 9);
    const proteinKcal = protein * 4;
    const carbsKcal = Math.max(kcal - proteinKcal - fatKcal, 0);
    const carbs = Math.round(carbsKcal / 4);
    return { kcal, protein, carbs, fat, maintenance, computedAt: Date.now() };
  }

  // Epley formula
  function estimate1RM(weight, reps) {
    if (!weight || !reps) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  }

  /* ---------------- Database alimenti: vedi foods.js ---------------- */
  const FOOD_CATEGORIES = window.GA.foods.CATEGORIES;
  const FOOD_DB = window.GA.foods.DB;

  function perGrams(food, grams) {
    const factor = grams / 100;
    return {
      kcal: Math.round(food.kcal * factor),
      p: Math.round(food.p * factor * 10) / 10,
      c: Math.round(food.c * factor * 10) / 10,
      f: Math.round(food.f * factor * 10) / 10,
    };
  }

  /* ---------------- Template di schede ---------------- */
  const MAIN_LIFTS = ["Squat", "Panca piana", "Stacco da terra", "Military press"];

  function loadRangeFor(goal) {
    if (goal === "forza") return { sets: 5, reps: "3-5", rest: 150 };
    if (goal === "resistenza") return { sets: 3, reps: "15-20", rest: 60 };
    return { sets: 4, reps: "8-12", rest: 90 }; // ipertrofia
  }

  const EXERCISE_POOL = {
    push: [
      { name: "Panca piana", type: "forza" },
      { name: "Military press manubri", type: "forza" },
      { name: "Spinte panca inclinata manubri", type: "ipertrofia" },
      { name: "Croci ai cavi", type: "ipertrofia" },
      { name: "Piegamenti", type: "resistenza" },
      { name: "Estensioni tricipiti ai cavi", type: "ipertrofia" },
    ],
    pull: [
      { name: "Stacco da terra", type: "forza" },
      { name: "Trazioni alla sbarra", type: "forza" },
      { name: "Rematore bilanciere", type: "ipertrofia" },
      { name: "Lat machine presa larga", type: "ipertrofia" },
      { name: "Curl bilanciere", type: "ipertrofia" },
      { name: "Face pull", type: "resistenza" },
    ],
    legs: [
      { name: "Squat", type: "forza" },
      { name: "Affondi manubri", type: "ipertrofia" },
      { name: "Leg press", type: "ipertrofia" },
      { name: "Leg curl", type: "ipertrofia" },
      { name: "Hip thrust", type: "ipertrofia" },
      { name: "Calf raise", type: "resistenza" },
    ],
    core: [
      { name: "Plank", type: "resistenza" },
      { name: "Crunch ai cavi", type: "ipertrofia" },
      { name: "Sollevamento gambe", type: "resistenza" },
    ],
    fullbody_bw: [
      { name: "Squat a corpo libero", type: "resistenza" },
      { name: "Piegamenti", type: "resistenza" },
      { name: "Affondi", type: "resistenza" },
      { name: "Plank", type: "resistenza" },
      { name: "Trazioni / rematore elastico", type: "resistenza" },
      { name: "Hip thrust a corpo libero", type: "resistenza" },
    ],
  };

  function trainingGoalFromProfile(profile) {
    // deduce l'obiettivo di allenamento (non alimentare) da obiettivo generale + sport
    if (profile.sports && profile.sports.length) return "ipertrofia"; // atleti: forza funzionale/ipertrofia mista, teniamo ipertrofia come bilanciato
    if (profile.goal === "bulk") return "ipertrofia";
    if (profile.goal === "cut") return "resistenza";
    return "ipertrofia";
  }

  function buildExercise(base, goalType, id) {
    const lr = loadRangeFor(goalType === "auto" ? base.type : goalType);
    return {
      id,
      name: base.name,
      sets: lr.sets,
      reps: lr.reps,
      restSec: lr.rest,
    };
  }

  // genera un piano A/B (o full body se poche attrezzature/2 giorni)
  function generatePlan({ daysPerWeek, equipment, trainingGoal }, uidFn) {
    daysPerWeek = Math.max(2, Math.min(6, daysPerWeek || 3));
    const bodyweightOnly = equipment === "corpo_libero";
    let days = [];

    if (bodyweightOnly) {
      days = [
        { label: "Scheda A — Full body", pool: EXERCISE_POOL.fullbody_bw },
        { label: "Scheda B — Full body", pool: EXERCISE_POOL.fullbody_bw.slice().reverse() },
      ];
    } else if (daysPerWeek <= 3) {
      days = [
        { label: "Scheda A — Push/Legs", pool: EXERCISE_POOL.push.slice(0, 3).concat(EXERCISE_POOL.legs.slice(0, 2)) },
        { label: "Scheda B — Pull/Core", pool: EXERCISE_POOL.pull.slice(0, 3).concat(EXERCISE_POOL.core.slice(0, 2)) },
      ];
    } else {
      days = [
        { label: "Scheda A — Push", pool: EXERCISE_POOL.push },
        { label: "Scheda B — Pull", pool: EXERCISE_POOL.pull },
        { label: "Scheda C — Legs & Core", pool: EXERCISE_POOL.legs.slice(0, 4).concat(EXERCISE_POOL.core.slice(0, 2)) },
      ];
    }

    const planDays = days.map((d, di) => ({
      id: (uidFn ? uidFn("day") : "day_" + di),
      label: d.label,
      exercises: d.pool.map((ex, i) =>
        buildExercise(ex, trainingGoal === "misto" ? "auto" : trainingGoal, (uidFn ? uidFn("ex") : "ex_" + di + "_" + i))
      ),
    }));

    return {
      type: planDays.length === 2 ? "AB" : "ABC",
      days: planDays,
      startedAt: Date.now(),
      weekNumber: 1,
      lastDeloadWeek: 0,
      source: "coach",
      daysPerWeek,
      equipment,
      trainingGoal,
    };
  }

  window.GA.calc = {
    ACTIVITY_FACTORS,
    ACTIVITY_LABELS,
    bmi,
    bmiLabel,
    bmr,
    tdee,
    computeTargets,
    estimate1RM,
    FOOD_CATEGORIES,
    FOOD_DB,
    perGrams,
    MAIN_LIFTS,
    loadRangeFor,
    EXERCISE_POOL,
    trainingGoalFromProfile,
    generatePlan,
  };
})();
