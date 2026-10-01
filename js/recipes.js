/* ===========================================================
   recipes.js — Libro delle ricette: piatti salvati come insiemi
   di ingredienti con le loro grammature (una porzione).
   - Scrivi il nome del piatto: lo cerco nel tuo libro, poi nel
     ricettario di Yojo (piatti comuni con grammature tipiche) e,
     con Enrico AI, Claude ricostruisce ingredienti e porzioni di
     qualsiasi piatto, anche con varianti ("con doppio riso").
   - Ogni ricetta va nel diario con un tocco, come piatto unico o
     ingrediente per ingrediente, anche in mezza o doppia porzione.
   =========================================================== */
window.GA = window.GA || {};

(function () {
  const ui = () => window.GA.ui;
  const db = () => window.GA.db;
  const ai = () => window.GA.ai;
  const calc = () => window.GA.calc;
  const foods = () => window.GA.foods;
  const nut = () => window.GA.nutrition;

  const MEALS = [
    { id: "colazione", label: "Colazione", emoji: "☀️" },
    { id: "pranzo", label: "Pranzo", emoji: "🍝" },
    { id: "cena", label: "Cena", emoji: "🌙" },
    { id: "spuntini", label: "Spuntini", emoji: "🍎" },
  ];
  const TINT = "#8B6CFF";
  const r1 = (n) => Math.round((+n || 0) * 10) / 10;
  const fmtMult = (m) => String(r1(m)).replace(".", ",");

  /* ---------------- Ricettario di Yojo: una porzione, grammi a crudo ---------------- */
  // [nome, emoji, altri nomi separati da virgola, [[id alimento del catalogo, grammi], ...]]
  const RAW = [
    ["Pollo tikka masala", "🍛", "tikka masala, chicken tikka masala, pollo tikka", [["f_pollo", 150], ["f_ghee", 10], ["f_cipolla", 60], ["f_passata", 120], ["f_yogurt_bianco", 40], ["f_panna", 30], ["f_anacardi", 15], ["f_aglio", 5], ["f_spezie", 4], ["f_riso_basmati", 80]]],
    ["Butter chicken con riso", "🍛", "butter chicken, murgh makhani, pollo al burro", [["f_pollo", 150], ["f_burro", 15], ["f_cipolla", 50], ["f_passata", 120], ["f_panna", 50], ["f_anacardi", 10], ["f_aglio", 5], ["f_spezie", 4], ["f_riso_basmati", 80]]],
    ["Pollo al curry con riso", "🍛", "pollo al curry, curry di pollo, chicken curry", [["f_pollo", 150], ["f_latte_cocco", 100], ["f_cipolla", 50], ["f_evo", 10], ["f_spezie", 5], ["f_riso_basmati", 80]]],
    ["Dal di lenticchie con riso", "🥘", "dahl, dhal, daal, dal di lenticchie, lenticchie indiane", [["f_lenticchie_secche", 70], ["f_cipolla", 50], ["f_passata", 80], ["f_ghee", 10], ["f_aglio", 5], ["f_spezie", 4], ["f_riso_basmati", 60]]],
    ["Pasta alla carbonara", "🍝", "carbonara, spaghetti alla carbonara", [["f_pasta", 100], ["f_guanciale", 40], ["f_uova", 50], ["f_tuorlo", 20], ["f_pecorino", 20]]],
    ["Pasta all'amatriciana", "🍝", "amatriciana, bucatini all'amatriciana", [["f_pasta", 100], ["f_guanciale", 40], ["f_passata", 120], ["f_pecorino", 15], ["f_vino_bianco", 10]]],
    ["Pasta cacio e pepe", "🍝", "cacio e pepe, tonnarelli cacio e pepe", [["f_pasta", 100], ["f_pecorino", 50]]],
    ["Spaghetti al pomodoro", "🍝", "pasta al pomodoro, pasta al sugo, pomodoro e basilico, spaghetti al sugo", [["f_pasta", 100], ["f_passata", 150], ["f_evo", 10], ["f_aglio", 3], ["f_parmigiano", 10]]],
    ["Pasta al pesto", "🍝", "trofie al pesto, pasta al pesto genovese, pasta pesto", [["f_pasta", 100], ["f_pesto", 40], ["f_parmigiano", 10]]],
    ["Pasta al ragù", "🍝", "pasta alla bolognese, spaghetti alla bolognese, tagliatelle al ragu", [["f_pasta", 100], ["f_macinato15", 80], ["f_passata", 100], ["f_cipolla", 20], ["f_carote", 20], ["f_sedano", 15], ["f_evo", 10], ["f_vino_bianco", 15], ["f_parmigiano", 10]]],
    ["Pasta aglio, olio e peperoncino", "🍝", "aglio e olio, spaghetti aglio olio", [["f_pasta", 100], ["f_evo", 15], ["f_aglio", 6]]],
    ["Pasta tonno e pomodoro", "🍝", "pasta al tonno, spaghetti al tonno", [["f_pasta", 100], ["f_tonno_olio", 60], ["f_passata", 120], ["f_cipolla", 15], ["f_evo", 5]]],
    ["Pasta e fagioli", "🥣", "pasta fagioli", [["f_pasta", 60], ["f_fagioli", 150], ["f_passata", 60], ["f_cipolla", 20], ["f_carote", 20], ["f_sedano", 15], ["f_evo", 10], ["f_parmigiano", 10]]],
    ["Pasta e ceci", "🥣", "pasta ceci", [["f_pasta", 60], ["f_ceci", 150], ["f_passata", 50], ["f_aglio", 3], ["f_evo", 10]]],
    ["Pasta al salmone", "🍝", "pasta salmone e panna, penne al salmone", [["f_pasta", 100], ["f_salmone_aff", 60], ["f_panna", 40], ["f_cipolla", 15]]],
    ["Pasta zucchine e gamberi", "🍝", "pasta gamberi e zucchine", [["f_pasta", 100], ["f_gamberi", 100], ["f_zucchine", 150], ["f_evo", 12], ["f_aglio", 3]]],
    ["Spaghetti alle vongole", "🍝", "linguine alle vongole, pasta alle vongole", [["f_pasta", 100], ["f_vongole", 100], ["f_evo", 15], ["f_aglio", 5], ["f_vino_bianco", 15]]],
    ["Lasagne alla bolognese", "🍝", "lasagna, lasagne", [["f_pasta_uovo", 70], ["f_macinato15", 80], ["f_passata", 80], ["f_besciamella", 100], ["f_parmigiano", 15], ["f_cipolla", 15], ["f_evo", 5]]],
    ["Gnocchi al pomodoro", "🥟", "gnocchi al sugo, gnocchi pomodoro", [["f_gnocchi", 250], ["f_passata", 120], ["f_evo", 10], ["f_parmigiano", 10]]],
    ["Risotto ai funghi", "🍚", "risotto funghi", [["f_riso", 90], ["f_funghi", 120], ["f_burro", 10], ["f_parmigiano", 15], ["f_cipolla", 20], ["f_vino_bianco", 20], ["f_brodo", 300]]],
    ["Risotto alla milanese", "🍚", "risotto allo zafferano, risotto giallo", [["f_riso", 90], ["f_burro", 15], ["f_parmigiano", 20], ["f_cipolla", 20], ["f_vino_bianco", 20], ["f_brodo", 300]]],
    ["Insalata di riso", "🍚", "riso freddo", [["f_riso", 80], ["f_tonno_olio", 50], ["f_uova", 50], ["f_wurstel", 40], ["f_mais", 40], ["f_piselli", 30], ["f_olive", 15], ["f_emmental", 20]]],
    ["Riso, pollo e zucchine", "🍱", "riso e pollo, pollo e riso, meal prep", [["f_riso_basmati", 80], ["f_pollo", 150], ["f_zucchine", 150], ["f_evo", 10]]],
    ["Poke bowl al salmone", "🥗", "poke, poké, poke salmone", [["f_riso", 80], ["f_salmone", 100], ["f_avocado", 50], ["f_edamame", 40], ["f_cetrioli", 50], ["f_salsa_soia", 15]]],
    ["Pollo teriyaki con riso", "🍱", "chicken teriyaki, pollo teriyaki", [["f_pollo", 150], ["f_teriyaki", 30], ["f_olio_semi", 8], ["f_broccoli", 100], ["f_riso", 80]]],
    ["Pad thai ai gamberi", "🍜", "pad thai", [["f_noodles_riso", 80], ["f_gamberi", 100], ["f_uova", 50], ["f_germogli", 50], ["f_arachidi", 15], ["f_olio_semi", 12], ["f_salsa_soia", 15], ["f_zucchero", 5]]],
    ["Noodles con pollo e verdure", "🍜", "noodles saltati, chow mein, yakisoba, noodles al pollo", [["f_noodles", 80], ["f_pollo", 120], ["f_peperoni", 80], ["f_carote", 50], ["f_cipolla", 30], ["f_salsa_soia", 20], ["f_olio_semi", 10]]],
    ["Burrito di manzo", "🌯", "burrito", [["f_tortilla", 70], ["f_macinato15", 80], ["f_riso", 50], ["f_fagioli", 80], ["f_cheddar", 20], ["f_passata", 40], ["f_avocado", 30]]],
    ["Fajitas di pollo", "🌮", "fajitas", [["f_tortilla", 140], ["f_pollo", 150], ["f_peperoni", 100], ["f_cipolla", 50], ["f_olio_semi", 10], ["f_spezie", 3]]],
    ["Chili con carne e riso", "🌶️", "chili con carne", [["f_macinato15", 120], ["f_fagioli", 120], ["f_passata", 150], ["f_cipolla", 40], ["f_peperoni", 50], ["f_evo", 10], ["f_spezie", 4], ["f_riso", 60]]],
    ["Hamburger fatto in casa", "🍔", "burger, cheeseburger, hamburger con panino", [["f_panino_burger", 80], ["f_hamburger", 150], ["f_cheddar", 20], ["f_lattuga", 20], ["f_pomodori", 30], ["f_salsa_burger", 15]]],
    ["Gyros pita", "🥙", "gyros, pita gyros", [["f_pane_pita", 90], ["f_maiale", 120], ["f_yogurt_bianco", 40], ["f_cetrioli", 20], ["f_pomodori", 40], ["f_cipolla", 20], ["f_patatine_forno", 50]]],
    ["Pollo con patate al forno", "🍗", "pollo e patate, pollo al forno con patate", [["f_pollo", 150], ["f_patate", 250], ["f_evo", 15]]],
    ["Cotoletta con patatine", "🍗", "cotoletta, cotoletta alla milanese, pollo impanato, schnitzel", [["f_pollo", 150], ["f_uova", 25], ["f_pangrattato", 30], ["f_olio_semi", 20], ["f_patatine_forno", 150]]],
    ["Salmone al forno con patate", "🐟", "salmone e patate, salmone al forno", [["f_salmone", 150], ["f_patate", 200], ["f_evo", 10]]],
    ["Tagliata rucola e grana", "🥩", "tagliata, bistecca con rucola", [["f_manzo", 200], ["f_rucola", 50], ["f_grana", 15], ["f_evo", 15]]],
    ["Spezzatino con patate", "🍲", "spezzatino, stufato di manzo", [["f_manzo", 180], ["f_patate", 150], ["f_carote", 50], ["f_cipolla", 40], ["f_passata", 50], ["f_vino_bianco", 20], ["f_evo", 10]]],
    ["Caesar salad", "🥗", "insalata caesar, cesar salad", [["f_lattuga", 120], ["f_pollo", 120], ["f_parmigiano", 15], ["f_crostini", 20], ["f_caesar", 25]]],
    ["Insalata greca", "🥗", "greek salad", [["f_pomodori", 150], ["f_cetrioli", 100], ["f_feta", 70], ["f_olive", 20], ["f_cipolla", 20], ["f_evo", 10]]],
    ["Parmigiana di melanzane", "🍆", "parmigiana, melanzane alla parmigiana", [["f_melanzane", 250], ["f_olio_semi", 25], ["f_passata", 120], ["f_mozzarella", 70], ["f_parmigiano", 20]]],
    ["Frittata di zucchine", "🍳", "frittata con zucchine", [["f_uova", 120], ["f_zucchine", 150], ["f_parmigiano", 10], ["f_evo", 10]]],
    ["Uova strapazzate e pane", "🍳", "uova strapazzate, scrambled eggs", [["f_uova", 120], ["f_burro", 5], ["f_pane", 60]]],
    ["Avocado toast con uovo", "🥑", "avocado toast, toast avocado", [["f_pane_integrale", 60], ["f_avocado", 60], ["f_uova", 60], ["f_evo", 5]]],
    ["Shakshuka", "🍳", "uova in purgatorio, uova al pomodoro", [["f_uova", 120], ["f_passata", 200], ["f_peperoni", 80], ["f_cipolla", 40], ["f_evo", 10], ["f_spezie", 2], ["f_pane", 50]]],
    ["Couscous con verdure e ceci", "🥘", "couscous di verdure, cous cous con verdure", [["f_cous", 80], ["f_ceci", 120], ["f_zucchine", 100], ["f_peperoni", 80], ["f_evo", 10]]],
    ["Bowl di quinoa e pollo", "🥗", "quinoa e pollo, quinoa bowl", [["f_quinoa", 70], ["f_pollo", 130], ["f_avocado", 40], ["f_pomodorini", 100], ["f_evo", 10]]],
    ["Piadina crudo e mozzarella", "🫓", "piadina crudo, piadina con crudo", [["f_piadina", 90], ["f_prosciutto_crudo", 50], ["f_mozzarella", 60], ["f_rucola", 15]]],
    ["Porridge con banana", "🥣", "porridge, oatmeal, porridge d'avena", [["f_avena", 60], ["f_latte", 200], ["f_banana", 100], ["f_miele", 10]]],
    ["Overnight oats", "🥣", "overnight, avena in frigo", [["f_avena", 50], ["f_yogurt0", 120], ["f_latte", 100], ["f_mirtilli", 60], ["f_semi_chia", 10]]],
    ["Yogurt bowl con granola", "🥣", "yogurt e granola, yogurt bowl", [["f_yogurt0", 170], ["f_granola", 30], ["f_mirtilli", 80], ["f_miele", 10]]],
    ["Pancake avena e albumi", "🥞", "pancake proteici fatti in casa, pancake avena", [["f_avena", 50], ["f_albume", 150], ["f_banana", 60]]],
    ["Tiramisù", "🍰", "tiramisu", [["f_mascarpone", 50], ["f_savoiardi", 30], ["f_uova", 25], ["f_zucchero", 12], ["f_caffe", 40]]],

    // --- Cucina dal mondo, ad alto contenuto proteico ---
    // Indiana
    ["Pollo tandoori con riso", "🍗", "tandoori chicken, pollo tandoori", [["f_pollo", 200], ["f_yogurt0", 60], ["f_spezie", 5], ["f_aglio", 4], ["f_evo", 5], ["f_riso_basmati", 60]], "Indiana"],
    ["Chicken saag con riso", "🥬", "saag chicken, pollo agli spinaci, murgh saag", [["f_pollo", 170], ["f_spinaci", 200], ["f_cipolla", 40], ["f_yogurt0", 50], ["f_ghee", 8], ["f_aglio", 5], ["f_spezie", 4], ["f_riso_basmati", 60]], "Indiana"],
    ["Palak paneer con riso", "🧀", "palak paneer, paneer agli spinaci", [["f_paneer", 120], ["f_spinaci", 200], ["f_cipolla", 40], ["f_yogurt0", 40], ["f_ghee", 8], ["f_aglio", 5], ["f_spezie", 4], ["f_riso_basmati", 60]], "Indiana"],
    ["Chicken biryani", "🍛", "biryani, biryani di pollo, pollo biryani", [["f_pollo", 160], ["f_riso_basmati", 80], ["f_yogurt0", 50], ["f_cipolla", 50], ["f_ghee", 10], ["f_spezie", 5]], "Indiana"],
    // Giapponese
    ["Salmone teriyaki con riso ed edamame", "🍣", "salmone teriyaki, salmon teriyaki", [["f_salmone", 150], ["f_teriyaki", 25], ["f_riso", 70], ["f_edamame", 60]], "Giapponese"],
    ["Chirashi di salmone e tonno", "🍣", "chirashi, sashimi bowl, chirashi sushi", [["f_riso", 80], ["f_salmone", 80], ["f_tonno_fresco", 80], ["f_edamame", 40], ["f_salsa_soia", 10]], "Giapponese"],
    ["Oyakodon", "🍳", "oyako don, pollo e uova con riso", [["f_pollo", 150], ["f_uova", 100], ["f_cipolla", 50], ["f_salsa_soia", 15], ["f_zucchero", 5], ["f_riso", 80]], "Giapponese"],
    ["Ramen con pollo e uovo", "🍜", "ramen, ramen al pollo, miso ramen", [["f_noodles", 80], ["f_pollo", 150], ["f_uova", 60], ["f_brodo", 400], ["f_miso", 15], ["f_germogli", 30]], "Giapponese"],
    ["Tataki di tonno con edamame", "🐟", "tataki, tuna tataki, tataki di tonno", [["f_tonno_fresco", 180], ["f_semi_sesamo", 8], ["f_salsa_soia", 15], ["f_olio_semi", 5], ["f_edamame", 100]], "Giapponese"],
    // Cinese
    ["Pollo kung pao con riso", "🥜", "kung pao, pollo kung pao, gong bao", [["f_pollo", 170], ["f_arachidi", 20], ["f_peperoni", 80], ["f_salsa_soia", 15], ["f_olio_semi", 10], ["f_zucchero", 5], ["f_riso", 70]], "Cinese"],
    ["Manzo e broccoli con riso", "🥦", "manzo con broccoli, beef and broccoli", [["f_manzo", 170], ["f_broccoli", 200], ["f_salsa_soia", 20], ["f_olio_semi", 10], ["f_zucchero", 5], ["f_riso", 70]], "Cinese"],
    ["Mapo tofu con riso", "🌶️", "mapo tofu, tofu piccante", [["f_tofu", 250], ["f_macinato", 80], ["f_salsa_soia", 15], ["f_olio_semi", 10], ["f_spezie", 3], ["f_riso", 60]], "Cinese"],
    ["Gamberi saltati con verdure e riso", "🦐", "gamberi saltati, stir fry di gamberi, gamberi alla cinese", [["f_gamberi", 200], ["f_peperoni", 100], ["f_zucchine", 100], ["f_salsa_soia", 15], ["f_olio_semi", 10], ["f_riso", 70]], "Cinese"],
    // Thailandese
    ["Pad kra pao con uovo", "🌿", "kra pao, pad krapow, pollo al basilico thai", [["f_pollo", 180], ["f_uova", 60], ["f_peperoni", 50], ["f_aglio", 5], ["f_salsa_soia", 10], ["f_salsa_pesce", 10], ["f_olio_semi", 10], ["f_riso", 70]], "Thailandese"],
    ["Larb gai", "🥬", "larb, laab, insalata thai di pollo", [["f_pollo", 180], ["f_cipolla", 30], ["f_salsa_pesce", 15], ["f_lattuga", 80], ["f_riso", 50]], "Thailandese"],
    ["Satay di pollo con salsa di arachidi", "🍢", "satay, sate ayam, pollo satay", [["f_pollo", 180], ["f_burroarachidi", 25], ["f_latte_cocco", 30], ["f_salsa_soia", 10], ["f_cetrioli", 50], ["f_riso", 60]], "Thailandese"],
    ["Tom yum ai gamberi", "🍲", "tom yum, tom yum goong, zuppa thai", [["f_gamberi", 200], ["f_funghi", 100], ["f_pomodori", 60], ["f_brodo", 400], ["f_salsa_pesce", 15]], "Thailandese"],
    // Libanese
    ["Shish taouk con hummus", "🍢", "shish tawook, shish taouk, spiedini di pollo libanesi", [["f_pollo", 180], ["f_yogurt0", 40], ["f_evo", 10], ["f_hummus", 60], ["f_pane_pita", 60], ["f_insalata", 80]], "Libanese"],
    ["Kafta con tabbouleh", "🥙", "kafta, kofta, polpette libanesi", [["f_macinato", 150], ["f_cipolla", 20], ["f_bulgur", 40], ["f_prezzemolo", 30], ["f_pomodori", 80], ["f_evo", 10], ["f_yogurt0", 50]], "Libanese"],
    ["Shawarma di pollo nella pita", "🌯", "shawarma, shawarma di pollo, chicken shawarma", [["f_pane_pita", 90], ["f_pollo", 160], ["f_tahina", 15], ["f_yogurt0", 40], ["f_pomodori", 40], ["f_cetrioli", 30], ["f_cipolla", 20]], "Libanese"],
    ["Hummus con carne", "🫘", "hummus bil lahme, hummus con manzo", [["f_hummus", 150], ["f_macinato", 100], ["f_evo", 5], ["f_pane_pita", 50]], "Libanese"],
    // Indonesiana
    ["Nasi goreng con pollo e uovo", "🍳", "nasi goreng, riso fritto indonesiano", [["f_riso", 80], ["f_pollo", 140], ["f_uova", 60], ["f_salsa_soia", 15], ["f_olio_semi", 12], ["f_cipolla", 30], ["f_carote", 40]], "Indonesiana"],
    ["Gado-gado con tempeh e uova", "🥗", "gado gado, insalata indonesiana", [["f_tempeh", 120], ["f_uova", 100], ["f_patate", 100], ["f_fagiolini", 80], ["f_germogli", 40], ["f_burroarachidi", 20], ["f_salsa_soia", 10]], "Indonesiana"],
    ["Rendang di manzo con riso", "🥘", "rendang, beef rendang", [["f_manzo", 180], ["f_latte_cocco", 60], ["f_cipolla", 30], ["f_spezie", 5], ["f_olio_semi", 5], ["f_riso", 70]], "Indonesiana"],
    ["Mie goreng ai gamberi", "🍜", "mie goreng, noodles fritti indonesiani", [["f_noodles", 80], ["f_gamberi", 150], ["f_uova", 50], ["f_peperoni", 60], ["f_salsa_soia", 15], ["f_olio_semi", 12]], "Indonesiana"],
    // Coreana
    ["Bibimbap con manzo", "🍚", "bibimbap", [["f_riso", 80], ["f_manzo", 130], ["f_uova", 60], ["f_spinaci", 60], ["f_carote", 40], ["f_germogli", 40], ["f_olio_semi", 8], ["f_salsa_soia", 10]], "Coreana"],
  ];

  let builtIn = null;
  function catalog() {
    if (builtIn) return builtIn;
    builtIn = RAW.map(([name, emoji, alias, ing, cuisine], i) => ({
      id: "yojo_" + i, builtIn: true, name, emoji, cuisine: cuisine || "",
      aliases: alias.split(",").map((s) => s.trim()).filter(Boolean),
      ingredients: ing.map(([fid, g]) => ingredientFromFood(foods().DB.find((f) => f.id === fid), g)).filter(Boolean),
    }));
    return builtIn;
  }

  function ingredientFromFood(food, grams) {
    if (!food) return null;
    const m = calc().perGrams(food, grams);
    return { name: food.name, grams: Math.round(grams), kcal: m.kcal, p: m.p, c: m.c, f: m.f, emoji: food.emoji || foods().category(food.cat).emoji, cat: food.cat, foodId: food.id };
  }

  /* ---------------- Dati ---------------- */
  function book(data) {
    if (!Array.isArray(data.nutrition.recipeBook)) data.nutrition.recipeBook = [];
    return data.nutrition.recipeBook;
  }
  function getRecipe(id) {
    return book(db().getData()).find((r) => r.id === id) || catalog().find((r) => r.id === id) || null;
  }

  function totals(r) {
    return (r.ingredients || []).reduce((a, it) => ({ kcal: a.kcal + (+it.kcal || 0), p: a.p + (+it.p || 0), c: a.c + (+it.c || 0), f: a.f + (+it.f || 0), grams: a.grams + (+it.grams || 0) }), { kcal: 0, p: 0, c: 0, f: 0, grams: 0 });
  }

  function cleanIngredient(it) {
    const o = {
      name: String(it.name || "").trim(), grams: Math.round(+it.grams || 0), kcal: Math.round(+it.kcal || 0), p: r1(it.p), c: r1(it.c), f: r1(it.f),
      emoji: it.emoji || "🍽️", cat: it.cat || "altro",
    };
    if (it.foodId) o.foodId = it.foodId;
    return o;
  }

  // Salva una ricetta nel libro: aggiorna quella con lo stesso id (o, senza id, lo stesso nome)
  function saveRecipe(r) {
    let saved;
    db().updateData((d) => {
      const list = book(d);
      const key = foods().normalize(r.name).trim();
      const prev = list.find((x) => (r.id && x.id === r.id) || (!r.id && foods().normalize(x.name).trim() === key));
      saved = Object.assign(prev || { id: db().uid("rb"), createdAt: Date.now(), uses: 0 }, {
        name: r.name.trim(), emoji: r.emoji || "🍲", source: r.source || (prev && prev.source) || "manuale",
        ingredients: r.ingredients.filter((it) => String(it.name || "").trim()).map(cleanIngredient), updatedAt: Date.now(),
      });
      if (!prev) list.push(saved);
    });
    return saved;
  }

  /* ---------------- Ricerca per nome del piatto ---------------- */
  const STOP = new Set(["di", "del", "della", "dello", "dei", "degli", "delle", "con", "al", "alla", "allo", "alle", "ai", "agli", "e", "ed", "in", "a", "la", "il", "lo", "le", "gli", "un", "una", "uno", "da", "dal", "dallo", "dalla", "sul", "sulla", "nel", "nella", "per", "mio", "mia", "ho", "mangiato", "piatto", "the", "with"]);
  const stem = (w) => (w.length > 4 ? w.slice(0, -1) : w);
  function tokens(s) {
    return foods().normalize(s).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
  }
  const phrasesOf = (r) => [r.name].concat(r.aliases || []);

  // ricerca mentre scrivi: tutte le parole (anche a metà) devono comparire nel nome o in un alias
  // qui conta anche la cucina: "thai" o "indiana" elencano i piatti di quel paese
  function fuzzyScore(r, qTok) {
    let best = null;
    phrasesOf(r).concat(r.cuisine ? ["cucina " + r.cuisine + (r.cuisine === "Thailandese" ? " thai" : "")] : []).forEach((ph, i) => {
      const pTok = tokens(ph);
      if (!qTok.every((qt) => pTok.some((pt) => pt.startsWith(stem(qt))))) return;
      const s = (pTok[0] && pTok[0].startsWith(stem(qTok[0])) ? 0 : 1) + (i ? 0.3 : 0) + ph.length / 200;
      if (best == null || s < best) best = s;
    });
    return best;
  }

  function suggestions(q, limit) {
    const qTok = tokens(q);
    if (!qTok.length) return [];
    const rank = (list, mine) => list.map((r) => ({ r, mine, s: fuzzyScore(r, qTok) })).filter((x) => x.s != null).sort((a, b) => a.s - b.s);
    return rank(book(db().getData()), true).concat(rank(catalog(), false)).slice(0, limit || 6);
  }

  // Riconosce il piatto in una frase ("pranzo: pollo tikka masala"): il nome della ricetta
  // (o un alias) deve comparire per intero. equal = la frase non aggiunge altro (varianti, quantità).
  function findExact(q, list, opts) {
    const qWords = new Set(tokens(q));
    const qStems = new Set([...qWords].map(stem));
    if (!qStems.size) return null;
    let best = null;
    list.forEach((r) => {
      const all = new Set([].concat(...phrasesOf(r).map((ph) => tokens(ph).map(stem))));
      phrasesOf(r).forEach((ph) => {
        const pWords = tokens(ph);
        const pStems = pWords.map(stem);
        if (!pStems.length) return;
        // un nome di una sola parola deve esserci identico ("parmigiano" non è "parmigiana")
        let ok = pWords.length === 1 ? qWords.has(pWords[0]) : pStems.every((s) => qStems.has(s));
        // nel tuo libro vale anche il contrario: "tikka" trova "Tikka della mamma" se è l'unica parola mancante
        if (!ok && opts && opts.loose && qStems.size >= 2) ok = [...qStems].every((s) => pStems.includes(s));
        if (!ok) return;
        const equal = [...qStems].every((s) => all.has(s));
        const score = pStems.length + (equal ? 100 : 0);
        if (!best || score > best.score) best = { r, equal, score };
      });
    });
    return best;
  }

  // Per l'import da testo: prima il tuo libro, poi il ricettario
  function matchDish(q) {
    const hit = findExact(q, book(db().getData())) || findExact(q, catalog());
    return hit ? hit.r : null;
  }

  // Voce di diario "piatto unico" a partire da una ricetta
  function dishItem(r, mult) {
    const t = totals(r);
    mult = mult || 1;
    return { name: r.name, grams: Math.round(t.grams * mult), kcal: Math.round(t.kcal * mult), p: r1(t.p * mult), c: r1(t.c * mult), f: r1(t.f * mult), emoji: r.emoji || "🍲", cat: "altro", recipeId: r.builtIn ? undefined : r.id };
  }

  /* ---------------- Scrivi un piatto → capisco cosa hai mangiato ---------------- */
  function resolve(q, meal) {
    q = q.trim();
    if (!q) return;
    const aiOn = ai().isConfigured();
    const mine = findExact(q, book(db().getData()), { loose: true });
    if (mine && (mine.equal || !aiOn)) return openLog(mine.r, { meal });
    const known = findExact(q, catalog());
    if (known && (known.equal || !aiOn)) return openEditor(known.r, { meal, banner: "📖 Dal ricettario di Yojo: grammature di una porzione tipica. Adattale a come lo prepari tu e salvalo nel tuo libro." });
    if (aiOn) return askEnrico(q, meal, (mine || known || {}).r);
    openEditor({ name: q.charAt(0).toUpperCase() + q.slice(1), emoji: "🍲", ingredients: [] }, {
      meal, banner: "Non conosco ancora «" + q + "»: aggiungi gli ingredienti con i grammi, lo ritrovi nel tuo libro per le prossime volte.", upsell: true,
    });
  }

  async function askEnrico(q, meal, reference) {
    const html =
      '<div class="sheet-title">📖 ' + ui().escapeHtml(q.charAt(0).toUpperCase() + q.slice(1)) + "</div>" +
      '<div class="card ai-result" id="ae-out"><div class="row" style="gap:12px;"><div class="food-tile" style="--tint:#6D4AFF"><span class="typing"><i></i></span></div><div style="flex:1;"><div class="shimmer" style="width:70%;"></div><div class="shimmer" style="width:45%;margin-top:8px;"></div></div></div>' +
      '<div class="shimmer" style="margin-top:14px;"></div><div class="shimmer" style="margin-top:8px;width:80%;"></div>' +
      '<p class="small muted" style="margin-top:10px;font-weight:600;">Enrico sta ricostruendo ingredienti e porzioni…</p></div>';
    const overlay = ui().openSheet(html);
    try {
      const r = await ai().recipeFromDish(q, reference);
      if (!overlay.isConnected) return;
      if (!r.ingredients.length) throw new Error("Non ho riconosciuto il piatto: prova a descriverlo meglio.");
      openEditor(Object.assign(r, { source: "enrico" }), { meal, banner: "✨ Enrico: " + (r.note || "ecco ingredienti e grammature di una porzione.") + " Controlla e correggi se lo fai diversamente." });
    } catch (err) {
      if (!overlay.isConnected) return;
      overlay.querySelector("#ae-out").outerHTML =
        '<div class="card tint-pink flat ai-result"><p class="small" style="font-weight:600;">' + ui().escapeHtml(ai().friendlyError(err)) + "</p></div>" +
        '<button class="btn secondary" id="ae-manual" style="margin-top:12px;">' + ui().icon("edit") + " Crea la ricetta a mano</button>";
      overlay.querySelector("#ae-manual").addEventListener("click", () => openEditor(reference || { name: q.charAt(0).toUpperCase() + q.slice(1), ingredients: [] }, { meal }));
    }
  }

  /* ---------------- Card nella sezione Cibo ---------------- */
  function cardHtml(data) {
    const aiOn = ai().isConfigured();
    const mine = book(data).slice().sort((a, b) => (b.uses || 0) - (a.uses || 0) || (b.lastUsed || b.updatedAt || 0) - (a.lastUsed || a.updatedAt || 0));
    const examples = ["Pollo tikka masala", "Pasta alla carbonara", "Poke bowl al salmone", "Porridge con banana"].map((n) => catalog().find((r) => r.name === n)).filter(Boolean);
    return (
      '<div class="section-title">Libro delle ricette <button class="link-btn" id="rb-all">📖 ' + (mine.length ? "Tutte (" + mine.length + ")" : "Sfoglia") + "</button></div>" +
      '<div class="card tint-violet rb-card">' +
      '<div style="font-family:var(--font-display);font-weight:800;font-size:17px;line-height:1.25;">Scrivi il piatto che hai mangiato</div>' +
      '<p class="small muted" style="margin-top:3px;font-weight:600;">' + (aiOn
        ? "Enrico capisce ingredienti e porzioni di qualsiasi piatto, anche con varianti («con doppio riso»)."
        : "Lo cerco tra le tue ricette e nel ricettario di Yojo, con ingredienti e porzioni già pronti.") + "</p>" +
      '<div class="row" style="gap:8px;margin-top:12px;"><div class="searchbar" style="margin-top:0;flex:1;">' + ui().icon("search") +
      '<input type="search" id="rb-q" placeholder="es. pollo tikka masala" autocomplete="off" enterkeyhint="go" /></div>' +
      '<button class="iconbtn" id="rb-go" aria-label="Cerca il piatto" style="background:var(--violet);color:#fff;width:48px;height:48px;flex-shrink:0;">' + ui().icon(aiOn ? "sparkle" : "check") + "</button></div>" +
      '<div id="rb-sug"></div>' +
      '<div class="chip-row" style="margin-top:12px;">' +
      '<button class="chip" id="rb-new"><span class="em">➕</span>Nuova ricetta</button>' +
      (mine.length
        ? mine.slice(0, 10).map((r) => '<button class="chip" data-rbopen="' + r.id + '"><span class="em">' + (r.emoji || "🍲") + "</span>" + ui().escapeHtml(r.name) + "</button>").join("")
        : examples.map((r) => '<button class="chip" data-rbopen="' + r.id + '"><span class="em">' + r.emoji + "</span>" + ui().escapeHtml(r.name) + "</button>").join("")) +
      "</div>" +
      window.GA.quickLog.upsellHtml("Con Enrico basta il nome di qualsiasi piatto: ingredienti e porzioni li ricostruisce lui.", "margin-top:10px;") +
      "</div>"
    );
  }

  function wireCard(container) {
    const q = container.querySelector("#rb-q");
    if (!q) return;
    const box = container.querySelector("#rb-sug");
    const draw = () => {
      const term = q.value.trim();
      if (!term) { box.innerHTML = ""; return; }
      box.innerHTML = '<div class="card flat" style="padding:4px 12px;margin-top:10px;">' + searchRowsHtml(term, 5) + askRowHtml(term) + "</div>";
      wireRows(box);
      const ask = box.querySelector("[data-rbask]");
      if (ask) ask.addEventListener("click", () => resolve(term));
    };
    q.addEventListener("input", draw);
    q.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); q.blur(); resolve(q.value); } });
    container.querySelector("#rb-go").addEventListener("click", () => { if (q.value.trim()) resolve(q.value); else q.focus(); });
    container.querySelector("#rb-all").addEventListener("click", () => openBook());
    container.querySelector("#rb-new").addEventListener("click", () => openEditor({ name: "", emoji: "🍲", ingredients: [] }, {}));
    container.querySelectorAll("[data-rbopen]").forEach((b) => b.addEventListener("click", () => openRecipe(getRecipe(b.dataset.rbopen))));
  }

  function askRowHtml(term) {
    const aiOn = ai().isConfigured();
    return '<div class="food-row clickable" data-rbask><div class="food-tile" style="--tint:' + (aiOn ? "#6D4AFF" : "#FFF3CF") + '">' + (aiOn ? "✨" : "✏️") + '</div><div class="fr-main"><div class="fr-name">' +
      (aiOn ? "Chiedi a Enrico: «" + ui().escapeHtml(term) + "»" : "Crea «" + ui().escapeHtml(term) + "»") +
      '</div><div class="fr-meta">' + (aiOn ? "Ingredienti e porzioni ricostruiti al volo" : "Aggiungi tu ingredienti e grammi") + '</div></div><div class="add-dot">' + ui().icon(aiOn ? "sparkle" : "plus") + "</div></div>";
  }

  const CUISINES = [
    { id: "Indiana", flag: "🇮🇳" }, { id: "Giapponese", flag: "🇯🇵" }, { id: "Cinese", flag: "🇨🇳" }, { id: "Thailandese", flag: "🇹🇭" },
    { id: "Libanese", flag: "🇱🇧" }, { id: "Indonesiana", flag: "🇮🇩" }, { id: "Coreana", flag: "🇰🇷" },
  ];
  // proteine della porzione, in evidenza se il piatto è davvero proteico
  function proteinMeta(r, t) {
    return '<span class="mm-p"' + (t.p >= 35 ? ' style="font-weight:800;"' : "") + ">💪 " + Math.round(t.p) + " g prot</span>";
  }

  // Righe ricetta per i risultati di ricerca (anche nella barra principale e nel selettore del pasto)
  function searchRowsHtml(q, limit) {
    return suggestions(q, limit).map(({ r, mine }) => {
      const t = totals(r);
      return '<div class="food-row clickable" data-rbrow="' + r.id + '"><div class="food-tile" style="--tint:' + TINT + '">' + (r.emoji || "🍲") + "</div>" +
        '<div class="fr-main"><div class="fr-name">' + ui().escapeHtml(r.name) + (mine ? " 📖" : "") + '</div><div class="fr-meta">' + proteinMeta(r, t) + "<span>" + (mine ? "La tua ricetta" : r.cuisine || "Ricettario Yojo") + "</span></div></div>" +
        '<div class="fr-kcal">' + Math.round(t.kcal) + " <small>kcal</small></div></div>";
    }).join("");
  }
  function wireRows(root, meal) {
    root.querySelectorAll("[data-rbrow]").forEach((row) => row.addEventListener("click", () => openRecipe(getRecipe(row.dataset.rbrow), { meal })));
  }

  // Le tue ricette si aggiungono subito; quelle del ricettario passano dall'editor
  function openRecipe(r, opts) {
    if (!r) return;
    opts = opts || {};
    if (r.builtIn) openEditor(r, { meal: opts.meal, banner: "📖 Dal ricettario di Yojo: grammature di una porzione tipica. Adattale a come lo prepari tu e salvalo nel tuo libro." });
    else openLog(r, opts);
  }

  /* ---------------- Sheet: il libro ---------------- */
  function openBook() {
    const html =
      '<div class="sheet-title">📖 Libro delle ricette</div>' +
      '<div class="searchbar" style="margin-top:0;">' + ui().icon("search") + '<input type="search" id="bk-q" placeholder="Cerca un piatto…" autocomplete="off" /></div>' +
      '<div class="chip-row" id="bk-filters" style="margin-top:12px;">' +
      '<button class="chip" data-bkf="protein"><span class="em">💪</span>Più proteiche</button>' +
      CUISINES.map((c) => '<button class="chip" data-bkf="' + c.id + '"><span class="em">' + c.flag + "</span>" + c.id + "</button>").join("") + "</div>" +
      '<button class="btn secondary" id="bk-new" style="margin-top:8px;">' + ui().icon("plus") + " Nuova ricetta</button>" +
      '<div id="bk-list"></div>';
    const overlay = ui().openSheet(html);
    const q = overlay.querySelector("#bk-q");
    const list = overlay.querySelector("#bk-list");
    let filt = "";
    const row = (r) => {
      const t = totals(r);
      return '<div class="food-row clickable" data-rbrow="' + r.id + '"><div class="food-tile" style="--tint:' + TINT + '">' + (r.emoji || "🍲") + "</div>" +
        '<div class="fr-main"><div class="fr-name">' + ui().escapeHtml(r.name) + '</div><div class="fr-meta">' + proteinMeta(r, t) + (r.cuisine ? "<span>" + r.cuisine + "</span>" : "") + (r.uses ? "<span>mangiato " + r.uses + (r.uses === 1 ? " volta" : " volte") + "</span>" : "") + "</div></div>" +
        '<div class="fr-kcal">' + Math.round(t.kcal) + " <small>kcal</small></div></div>";
    };
    overlay.querySelectorAll("[data-bkf]").forEach((b) => b.addEventListener("click", () => {
      filt = filt === b.dataset.bkf ? "" : b.dataset.bkf;
      overlay.querySelectorAll("[data-bkf]").forEach((x) => x.classList.toggle("on", x.dataset.bkf === filt));
      draw();
    }));
    function draw() {
      const term = q.value.trim();
      const qTok = tokens(term);
      const byProtein = (a, b) => totals(b).p - totals(a).p;
      const filter = (arr) => {
        let out = qTok.length ? arr.filter((r) => fuzzyScore(r, qTok) != null) : arr;
        if (filt === "protein") out = out.filter((r) => totals(r).p >= 35).sort(byProtein);
        else if (filt) out = out.filter((r) => r.cuisine === filt).sort(byProtein);
        return out;
      };
      const mine = filter(book(db().getData()).slice().sort((a, b) => a.name.localeCompare(b.name, "it")));
      const yojo = filter(catalog());
      let html = '<div class="section-title" style="font-size:16px;">Le tue ricette <span class="badge">' + mine.length + "</span></div>";
      html += mine.length ? '<div class="card" style="padding:4px 14px;">' + mine.map(row).join("") + "</div>"
        : '<div class="empty" style="padding:14px 10px;">' + (term ? "Nessuna tua ricetta con questo nome." : "Ancora nessuna: crea la prima o scegline una qui sotto.") + "</div>";
      html += '<div class="section-title" style="font-size:16px;">Ricettario di Yojo <span class="badge">' + yojo.length + "</span></div>";
      html += yojo.length ? '<div class="card" style="padding:4px 14px;">' + yojo.map(row).join("") + "</div>" : "";
      if (term) html += '<div class="card" style="padding:4px 14px;margin-top:12px;">' + askRowHtml(term) + "</div>";
      list.innerHTML = html;
      wireRows(list);
      const ask = list.querySelector("[data-rbask]");
      if (ask) ask.addEventListener("click", () => resolve(term));
    }
    q.addEventListener("input", draw);
    overlay.querySelector("#bk-new").addEventListener("click", () => openEditor({ name: q.value.trim(), emoji: "🍲", ingredients: [] }, {}));
    draw();
  }

  /* ---------------- Sheet: aggiungi una ricetta al diario ---------------- */
  function openLog(recipe, opts) {
    opts = opts || {};
    let mult = 1;
    let meal = opts.meal || nut().defaultMeal();
    let split = false;
    const t1 = totals(recipe);
    const html =
      '<div class="qa-head"><div class="food-tile lg" style="--tint:' + TINT + '">' + (recipe.emoji || "🍲") + "</div>" +
      '<div><div class="qa-cat">📖 La tua ricetta · ' + recipe.ingredients.length + " ingredienti</div><div class=\"qa-name\">" + ui().escapeHtml(recipe.name) + "</div></div></div>" +
      '<div class="qa-grams"><div class="stepper"><button data-mstep="-0.25" aria-label="Meno">' + ui().icon("minus") + '</button><div class="value"><span id="lg-mult">1</span><small> porz.</small></div><button data-mstep="0.25" aria-label="Più">' + ui().icon("plus") + "</button></div></div>" +
      '<div class="chip-row" style="justify-content:center;">' + [0.5, 1, 1.5, 2].map((m) => '<button class="chip" data-mult="' + m + '">' + (m === 0.5 ? "½" : m === 1.5 ? "1½" : m) + (m === 1 ? " porzione" : "") + "</button>").join("") + "</div>" +
      '<div class="qa-macros">' +
      '<div class="qa-m kcal"><div class="v" id="lg-kcal">0</div><div class="l">kcal</div></div>' +
      '<div class="qa-m p"><div class="v" id="lg-p">0</div><div class="l">Prot</div></div>' +
      '<div class="qa-m c"><div class="v" id="lg-c">0</div><div class="l">Carbo</div></div>' +
      '<div class="qa-m f"><div class="v" id="lg-f">0</div><div class="l">Grassi</div></div></div>' +
      '<div class="card flat rb-ings" id="lg-ings"></div>' +
      '<div class="segmented" id="lg-meal">' + MEALS.map((m) => '<button data-meal="' + m.id + '" class="' + (m.id === meal ? "active" : "") + '">' + m.emoji + " " + m.label + "</button>").join("") + "</div>" +
      '<div class="segmented" id="lg-mode" style="margin-top:8px;"><button data-mode="dish" class="active">🍲 Piatto unico</button><button data-mode="split">🧩 Ingrediente per ingrediente</button></div>' +
      '<button class="btn" id="lg-add" style="margin-top:16px;">' + ui().icon("plus") + ' <span id="lg-add-lbl"></span></button>' +
      '<button class="link-btn" id="lg-edit" style="margin:12px auto 0;display:flex;">' + ui().icon("edit") + " Modifica ingredienti</button>";
    const overlay = ui().openSheet(html);
    let prev = { kcal: 0, p: 0, c: 0, f: 0 };

    function update() {
      const m = { kcal: Math.round(t1.kcal * mult), p: r1(t1.p * mult), c: r1(t1.c * mult), f: r1(t1.f * mult) };
      overlay.querySelector("#lg-mult").textContent = fmtMult(mult);
      ui().countUp(overlay.querySelector("#lg-kcal"), prev.kcal, m.kcal, { duration: 300 });
      ["p", "c", "f"].forEach((k) => ui().countUp(overlay.querySelector("#lg-" + k), prev[k], m[k], { duration: 300, decimals: m[k] < 10 ? 1 : 0 }));
      prev = m;
      overlay.querySelectorAll("[data-mult]").forEach((b) => b.classList.toggle("on", +b.dataset.mult === mult));
      overlay.querySelector("#lg-ings").innerHTML = recipe.ingredients.map((it) =>
        '<div class="rb-ing-line"><span>' + (it.emoji || "🍽️") + " " + ui().escapeHtml(it.name) + '</span><span class="muted">' + Math.round(it.grams * mult) + " g · " + Math.round(it.kcal * mult) + " kcal</span></div>").join("");
      overlay.querySelector("#lg-add-lbl").textContent = "Aggiungi a " + MEALS.find((x) => x.id === meal).label.toLowerCase();
    }
    update();

    overlay.querySelectorAll("[data-mstep]").forEach((b) => b.addEventListener("click", () => { mult = Math.max(0.25, Math.min(5, mult + parseFloat(b.dataset.mstep))); ui().haptic(6); update(); }));
    overlay.querySelectorAll("[data-mult]").forEach((b) => b.addEventListener("click", () => { mult = +b.dataset.mult; update(); }));
    overlay.querySelectorAll("#lg-meal [data-meal]").forEach((b) => b.addEventListener("click", () => {
      meal = b.dataset.meal;
      overlay.querySelectorAll("#lg-meal [data-meal]").forEach((x) => x.classList.toggle("active", x === b));
      update();
    }));
    overlay.querySelectorAll("#lg-mode [data-mode]").forEach((b) => b.addEventListener("click", () => {
      split = b.dataset.mode === "split";
      overlay.querySelectorAll("#lg-mode [data-mode]").forEach((x) => x.classList.toggle("active", x === b));
    }));
    overlay.querySelector("#lg-edit").addEventListener("click", () => openEditor(recipe, { meal }));
    overlay.querySelector("#lg-add").addEventListener("click", () => logRecipe(recipe, mult, meal, split, overlay.querySelector(".food-tile.lg")));
  }

  function logRecipe(recipe, mult, meal, split, fromEl) {
    const items = split
      ? recipe.ingredients.map((it) => ({
          name: it.name, grams: Math.round(it.grams * mult), kcal: Math.round(it.kcal * mult), p: r1(it.p * mult), c: r1(it.c * mult), f: r1(it.f * mult),
          emoji: it.emoji || "🍽️", cat: it.cat || "altro", foodId: it.foodId, recipeId: recipe.builtIn ? undefined : recipe.id,
        }))
      : [dishItem(recipe, mult)];
    const fromRect = fromEl ? fromEl.getBoundingClientRect() : null;
    db().updateData((d) => {
      const day = nut().todayLog(d);
      items.forEach((it) => day[meal].push(Object.assign({ id: db().uid("item"), ts: Date.now() }, it)));
      const rec = book(d).find((x) => x.id === recipe.id);
      if (rec) { rec.uses = (rec.uses || 0) + 1; rec.lastUsed = Date.now(); }
    });
    ui().haptic(20);
    ui().closeSheet();
    if (window.GA.app.currentTab() !== "alimentazione") window.GA.app.setTab("alimentazione");
    else window.GA.app.refresh();
    const ring = document.getElementById("nu-ring");
    if (fromRect && ring) {
      ui().flyEmoji(recipe.emoji || "🍲", fromRect, ring, () => {
        ring.classList.remove("bump");
        void ring.offsetWidth;
        ring.classList.add("bump");
        const r = ring.getBoundingClientRect();
        ui().burst(r.left + r.width / 2, r.top + r.height / 2);
      });
    }
    ui().toast("Aggiunto a " + MEALS.find((x) => x.id === meal).label.toLowerCase() + ": " + recipe.name + (mult !== 1 ? " ×" + fmtMult(mult) : ""));
  }

  /* ---------------- Sheet: crea / modifica una ricetta ---------------- */
  function withRate(it) {
    it.rate = it.grams > 0 && it.kcal > 0 ? { kcal: it.kcal / it.grams, p: it.p / it.grams, c: it.c / it.grams, f: it.f / it.grams } : null;
    return it;
  }

  function openEditor(recipe, opts) {
    opts = opts || {};
    const data = db().getData();
    const existing = !recipe.builtIn && recipe.id && book(data).some((x) => x.id === recipe.id);
    const r = {
      id: existing ? recipe.id : null,
      name: recipe.name || "",
      emoji: recipe.emoji || "🍲",
      source: recipe.builtIn ? "ricettario" : recipe.source,
      ingredients: (recipe.ingredients || []).map((it) => withRate(Object.assign({}, it))),
    };
    let meal = opts.meal || nut().defaultMeal();
    const aiOn = ai().isConfigured();

    const html =
      '<div class="sheet-title">📖 ' + (existing ? "Modifica ricetta" : "Nuova ricetta") + "</div>" +
      (opts.banner ? '<div class="card tint-lime flat" style="padding:10px 14px;margin-bottom:12px;"><p class="small" style="font-weight:600;line-height:1.5;">' + ui().escapeHtml(opts.banner) + "</p></div>" : "") +
      '<div class="row" style="gap:8px;align-items:flex-end;">' +
      '<div class="field" style="flex:0 0 64px;"><label>Icona</label><input type="text" id="re-emoji" value="' + ui().escapeHtml(r.emoji) + '" maxlength="4" style="text-align:center;font-size:20px;padding:9px 4px;" /></div>' +
      '<div class="field" style="flex:1;"><label>Nome del piatto</label><input type="text" id="re-name" placeholder="es. Pollo tikka masala" value="' + ui().escapeHtml(r.name) + '" /></div></div>' +
      '<div class="row" style="margin:2px 0 8px;"><span class="small" style="font-weight:800;">Ingredienti · 1 porzione</span><span class="small muted" style="font-weight:700;">grammi · kcal</span></div>' +
      '<div id="re-list"></div>' +
      '<div class="searchbar" style="margin-top:6px;">' + ui().icon("plus") + '<input type="search" id="re-q" placeholder="Aggiungi ingrediente (es. burro chiarificato)" autocomplete="off" /></div>' +
      '<div id="re-res"></div>' +
      '<div class="rv-total" id="re-tot" style="margin-top:12px;"></div>' +
      (existing
        ? '<button class="btn" id="re-save" style="margin-top:14px;">' + ui().icon("check") + " Salva modifiche</button>" +
          '<button class="btn ghost" id="re-del" style="margin-top:10px;color:var(--bad);">' + ui().icon("trash") + " Elimina ricetta</button>"
        : '<div class="segmented" id="re-meal" style="margin-top:14px;">' + MEALS.map((m) => '<button data-meal="' + m.id + '" class="' + (m.id === meal ? "active" : "") + '">' + m.emoji + " " + m.label + "</button>").join("") + "</div>" +
          '<button class="btn" id="re-log" style="margin-top:14px;">' + ui().icon("plus") + ' <span id="re-log-lbl"></span></button>' +
          '<button class="btn secondary" id="re-save" style="margin-top:10px;">📖 Salva solo nel libro</button>' +
          '<p class="small muted" style="text-align:center;margin-top:8px;font-weight:600;">Aggiungendolo al diario lo salvo anche nel tuo libro delle ricette.</p>') +
      (opts.upsell ? window.GA.quickLog.upsellHtml("Con Enrico ti basta il nome del piatto: ingredienti e grammi li trova lui.", "margin-top:12px;") : "");
    const overlay = ui().openSheet(html);
    const $ = (s) => overlay.querySelector(s);
    const list = $("#re-list");
    window.GA.quickLog.wireUpsell(overlay);
    if (!r.name) setTimeout(() => $("#re-name").focus(), 350);
    else if (!r.ingredients.length) setTimeout(() => $("#re-q").focus(), 350);

    function drawTotals() {
      const t = totals(r);
      $("#re-tot").innerHTML = r.ingredients.length
        ? "1 porzione · <b>" + Math.round(t.kcal) + " kcal</b> · P " + Math.round(t.p) + " · C " + Math.round(t.c) + " · G " + Math.round(t.f) + ' <span class="muted">· ' + Math.round(t.grams) + " g</span>"
        : "";
      const lbl = $("#re-log-lbl");
      if (lbl) lbl.textContent = "Aggiungi a " + MEALS.find((x) => x.id === meal).label.toLowerCase();
    }

    function draw() {
      list.innerHTML = r.ingredients.length
        ? r.ingredients.map((it, i) =>
            '<div class="rb-ing' + (it.kcal > 0 ? "" : " missing") + '">' +
            '<span class="rb-ing-em">' + (it.emoji || "🍽️") + "</span>" +
            '<input type="text" data-in="' + i + '" value="' + ui().escapeHtml(it.name) + '" aria-label="Ingrediente" />' +
            '<label class="rb-ing-num"><input type="number" inputmode="decimal" data-ig="' + i + '" value="' + (it.grams || "") + '" /><span>g</span></label>' +
            '<label class="rb-ing-num"><input type="number" inputmode="decimal" data-ik="' + i + '" value="' + (it.kcal || "") + '" /><span>kcal</span></label>' +
            '<button class="rm-btn" data-idel="' + i + '" aria-label="Rimuovi">' + ui().icon("close") + "</button></div>"
          ).join("")
        : '<div class="empty" style="padding:12px 10px;">Nessun ingrediente: cercali qui sotto.</div>';
      list.querySelectorAll("[data-in]").forEach((el) => el.addEventListener("input", () => { r.ingredients[+el.dataset.in].name = el.value; }));
      list.querySelectorAll("[data-ig]").forEach((el) => el.addEventListener("input", () => {
        const it = r.ingredients[+el.dataset.ig];
        const g = parseFloat(el.value);
        if (!(g > 0)) return;
        it.grams = Math.round(g);
        if (it.rate) {
          it.kcal = Math.round(it.rate.kcal * it.grams);
          it.p = r1(it.rate.p * it.grams); it.c = r1(it.rate.c * it.grams); it.f = r1(it.rate.f * it.grams);
          const k = list.querySelector('[data-ik="' + el.dataset.ig + '"]');
          if (k) k.value = it.kcal;
        }
        drawTotals();
      }));
      list.querySelectorAll("[data-ik]").forEach((el) => el.addEventListener("input", () => {
        const it = r.ingredients[+el.dataset.ik];
        const k = parseFloat(el.value);
        if (!(k >= 0)) return;
        // kcal scritte a mano: le macro si scalano in proporzione (se note)
        const ratio = it.kcal > 0 ? k / it.kcal : 0;
        it.kcal = Math.round(k);
        if (ratio) { it.p = r1(it.p * ratio); it.c = r1(it.c * ratio); it.f = r1(it.f * ratio); }
        withRate(it);
        el.closest(".rb-ing").classList.toggle("missing", !(it.kcal > 0));
        drawTotals();
      }));
      list.querySelectorAll("[data-idel]").forEach((b) => b.addEventListener("click", () => { r.ingredients.splice(+b.dataset.idel, 1); draw(); }));
      drawTotals();
    }
    draw();

    // ricerca ingredienti: catalogo + tuoi alimenti, poi Enrico o inserimento a mano
    const q = $("#re-q");
    const res = $("#re-res");
    const addIngredient = (it) => {
      r.ingredients.push(withRate(it));
      q.value = "";
      res.innerHTML = "";
      draw();
      ui().haptic(8);
    };
    function drawResults() {
      const term = q.value.trim();
      if (!term) { res.innerHTML = ""; return; }
      const d = db().getData();
      const all = foods().DB.concat(d.nutrition.customFoods.map((f) => Object.assign({ custom: true }, f)));
      const found = foods().search(term, all).slice(0, 5);
      res.innerHTML = '<div class="card flat" style="padding:4px 12px;margin-top:8px;">' +
        found.map((f) => '<div class="food-row clickable" data-addfood="' + f.id + '">' + ui().foodTile(f) + '<div class="fr-main"><div class="fr-name">' + ui().escapeHtml(f.name) + (f.custom ? " ⭐" : "") + '</div><div class="fr-meta"><span>' + f.kcal + " kcal/100g · porzione " + (f.portion || 100) + ' g</span></div></div><div class="add-dot">' + ui().icon("plus") + "</div></div>").join("") +
        '<div class="food-row clickable" data-addother><div class="food-tile" style="--tint:' + (aiOn ? "#6D4AFF" : "#FFF3CF") + '">' + (aiOn ? "✨" : "✏️") + '</div><div class="fr-main"><div class="fr-name">' +
        (aiOn ? (found.length ? "Non è questo? " : "") + "Chiedi a Enrico: «" + ui().escapeHtml(term) + "»" : "Aggiungi «" + ui().escapeHtml(term) + "» e scrivi grammi e kcal") +
        '</div></div><div class="add-dot">' + ui().icon(aiOn ? "sparkle" : "plus") + "</div></div></div>";
      res.querySelectorAll("[data-addfood]").forEach((row) => row.addEventListener("click", () => {
        const f = all.find((x) => x.id === row.dataset.addfood);
        addIngredient(ingredientFromFood(f, f.portion || 100));
      }));
      res.querySelector("[data-addother]").addEventListener("click", async (e) => {
        const name = term.charAt(0).toUpperCase() + term.slice(1);
        if (!aiOn) { addIngredient({ name, grams: 100, kcal: 0, p: 0, c: 0, f: 0, emoji: "🍽️", cat: "altro" }); return; }
        const row = e.currentTarget;
        row.querySelector(".fr-name").textContent = "Enrico sta calcolando «" + term + "»…";
        try {
          const f = await ai().lookupFood(term);
          if (!overlay.isConnected) return;
          const m = calc().perGrams(f, f.portion || 100);
          addIngredient({ name: f.name, grams: f.portion || 100, kcal: m.kcal, p: m.p, c: m.c, f: m.f, emoji: f.emoji || "🍽️", cat: f.cat || "altro" });
        } catch (err) {
          ui().toast(ai().friendlyError(err), 3500);
          addIngredient({ name, grams: 100, kcal: 0, p: 0, c: 0, f: 0, emoji: "🍽️", cat: "altro" });
        }
      });
    }
    q.addEventListener("input", drawResults);

    const mealBtns = overlay.querySelectorAll("#re-meal [data-meal]");
    mealBtns.forEach((b) => b.addEventListener("click", () => {
      meal = b.dataset.meal;
      mealBtns.forEach((x) => x.classList.toggle("active", x === b));
      drawTotals();
    }));

    function collect() {
      r.name = $("#re-name").value.trim();
      r.emoji = $("#re-emoji").value.trim() || "🍲";
      if (!r.name) { ui().toast("Dai un nome al piatto"); $("#re-name").focus(); return null; }
      if (!r.ingredients.some((it) => String(it.name || "").trim())) { ui().toast("Aggiungi almeno un ingrediente"); q.focus(); return null; }
      const missing = r.ingredients.filter((it) => String(it.name || "").trim() && !(it.kcal > 0));
      if (missing.length && !overlay.dataset.confirmMissing) {
        overlay.dataset.confirmMissing = "1";
        ui().toast(missing.length + (missing.length === 1 ? " ingrediente è" : " ingredienti sono") + " senza calorie: completale o tocca di nuovo per salvare comunque", 3500);
        return null;
      }
      return saveRecipe(r);
    }

    $("#re-save").addEventListener("click", () => {
      const saved = collect();
      if (!saved) return;
      ui().toast("📖 " + saved.name + " salvato nel tuo libro");
      if (existing) openLog(saved, { meal });
      else { ui().closeSheet(); window.GA.app.refresh(); }
    });
    const logBtn = $("#re-log");
    if (logBtn) logBtn.addEventListener("click", () => {
      const saved = collect();
      if (saved) logRecipe(saved, 1, meal, false, null);
    });
    const del = $("#re-del");
    if (del) del.addEventListener("click", (e) => {
      const b = e.currentTarget;
      if (!b.dataset.sure) { b.dataset.sure = "1"; b.lastChild.textContent = " Tocca di nuovo per eliminare"; return; }
      db().updateData((d) => { d.nutrition.recipeBook = book(d).filter((x) => x.id !== r.id); });
      ui().closeSheet();
      ui().toast("Ricetta eliminata");
      window.GA.app.refresh();
    });
  }

  /* ---------------- Contesto per Enrico (chat e import) ---------------- */
  function promptContext(data) {
    const list = book(data || db().getData());
    if (!list.length) return "";
    return "\n\nPiatti del libro delle ricette dell'utente (valori per 1 porzione). Se ne nomina uno, usa questi valori moltiplicati per le porzioni mangiate, come un'unica voce col nome del piatto:\n" +
      list.map((r) => {
        const t = totals(r);
        return "- " + r.name + ": " + Math.round(t.grams) + " g, " + Math.round(t.kcal) + " kcal, P " + Math.round(t.p) + " C " + Math.round(t.c) + " G " + Math.round(t.f) + " (" + r.ingredients.map((it) => it.name + " " + it.grams + "g").join(", ") + ")";
      }).join("\n");
  }

  function snapshotFor(data) {
    return book(data).map((r) => {
      const t = totals(r);
      return { nome: r.name, kcal_porzione: Math.round(t.kcal), macro_porzione: "P" + Math.round(t.p) + " C" + Math.round(t.c) + " G" + Math.round(t.f), ingredienti: r.ingredients.map((it) => it.name + " " + it.grams + "g").join(", ") };
    });
  }

  window.GA.recipes = { cardHtml, wireCard, searchRowsHtml, wireRows, openBook, openLog, openEditor, openRecipe, resolve, matchDish, dishItem, saveRecipe, getRecipe, totals, promptContext, snapshotFor };
})();
