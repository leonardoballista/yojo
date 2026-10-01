/* ===========================================================
   recipedb.js — ricettario proteico dal mondo per il Libro delle
   ricette (recipes.js). Una porzione da adulto, grammi a crudo
   per carne, pesce, riso, pasta e legumi secchi; i valori si
   calcolano dal catalogo alimenti (foods.js).
   Formato: [nome, emoji, altri nomi separati da virgola,
             [[id alimento, grammi], ...], cucina, "dolce" per i dessert]
   =========================================================== */
window.GA = window.GA || {};

window.GA.recipeWorld = [
  // --- Italiana ---
  ["Pollo alla cacciatora con patate", "🍗", "pollo alla cacciatora, cacciatora", [["f_coscia_pollo", 200], ["f_passata", 100], ["f_cipolla", 40], ["f_olive", 15], ["f_vino_bianco", 20], ["f_evo", 10], ["f_patate", 150]], "Italiana"],
  ["Saltimbocca alla romana con spinaci", "🥩", "saltimbocca", [["f_vitello", 180], ["f_prosciutto_crudo", 30], ["f_burro", 10], ["f_vino_bianco", 20], ["f_spinaci", 200]], "Italiana"],
  ["Vitello tonnato", "🥩", "vitel tonne, vitel tonné", [["f_vitello", 160], ["f_tonno_olio", 40], ["f_maionese", 20], ["f_rucola", 50]], "Italiana"],
  ["Polpo e patate", "🐙", "insalata di polpo e patate, polpo con patate", [["f_polpo", 300], ["f_patate", 200], ["f_evo", 15], ["f_prezzemolo", 5]], "Italiana"],
  ["Pesce spada alla siciliana", "🐟", "pesce spada alla ghiotta, spada alla siciliana", [["f_pesce_spada", 200], ["f_pomodorini", 100], ["f_olive", 15], ["f_evo", 10], ["f_pane", 50]], "Italiana"],
  ["Bresaola rucola e grana", "🥓", "carpaccio di bresaola, bresaola con rucola", [["f_bresaola", 100], ["f_rucola", 50], ["f_grana", 20], ["f_evo", 10], ["f_pane", 50]], "Italiana"],
  ["Pollo alla pizzaiola", "🍅", "pizzaiola di pollo, fettine alla pizzaiola", [["f_pollo", 180], ["f_passata", 120], ["f_mozzarella_light", 50], ["f_evo", 8], ["f_pane", 50]], "Italiana"],
  ["Branzino al forno con patate", "🐠", "spigola al forno, branzino e patate", [["f_branzino", 250], ["f_patate", 200], ["f_evo", 10]], "Italiana"],
  ["Baccalà alla livornese", "🐟", "baccala al pomodoro", [["f_baccala", 220], ["f_passata", 120], ["f_olive", 15], ["f_evo", 10], ["f_pane", 50]], "Italiana"],
  ["Involtini di tacchino con zucchine", "🦃", "involtini di tacchino", [["f_tacchino", 180], ["f_prosciutto_cotto", 30], ["f_scamorza", 30], ["f_evo", 8], ["f_zucchine", 200]], "Italiana"],
  ["Frittata di albumi e spinaci", "🍳", "frittata di albumi, omelette di albumi e spinaci", [["f_albume", 250], ["f_uova", 60], ["f_spinaci", 150], ["f_parmigiano", 15], ["f_pane_integrale", 60]], "Italiana"],
  ["Bistecca alla fiorentina con patate", "🥩", "fiorentina, bistecca alla fiorentina", [["f_manzo", 300], ["f_patate", 150], ["f_evo", 10]], "Italiana"],
  ["Pasta integrale tonno e piselli", "🍝", "pasta tonno e piselli", [["f_pasta_integrale", 90], ["f_tonno", 80], ["f_piselli", 80], ["f_evo", 8]], "Italiana"],
  ["Polpette al sugo", "🍝", "polpette al pomodoro, polpette di carne al sugo", [["f_macinato", 150], ["f_uova", 25], ["f_pangrattato", 15], ["f_parmigiano", 10], ["f_passata", 150], ["f_evo", 5], ["f_pane", 50]], "Italiana"],
  ["Arrosto di tacchino con patate", "🦃", "arrosto di tacchino, tacchino al forno con patate", [["f_tacchino", 180], ["f_patate", 200], ["f_evo", 12]], "Italiana"],
  ["Cozze alla marinara", "🦪", "impepata di cozze, cozze al pomodoro", [["f_cozze", 250], ["f_passata", 80], ["f_aglio", 4], ["f_evo", 10], ["f_pane", 70]], "Italiana"],
  ["Spiedini di gamberi e calamari", "🍢", "spiedini di mare, spiedini di pesce", [["f_gamberi", 150], ["f_calamari", 150], ["f_pangrattato", 15], ["f_evo", 12], ["f_insalata", 100]], "Italiana"],
  ["Piadina tacchino e mozzarella light", "🫓", "piadina tacchino, piadina con tacchino", [["f_piadina", 90], ["f_fesa_aff", 90], ["f_mozzarella_light", 50], ["f_rucola", 20]], "Italiana"],
  ["Tagliata di pollo con verdure grigliate", "🍗", "pollo grigliato con verdure, pollo alla griglia", [["f_pollo", 200], ["f_zucchine", 150], ["f_melanzane", 100], ["f_peperoni", 80], ["f_evo", 12]], "Italiana"],
  ["Orata al cartoccio con patate", "🐠", "orata al forno, orata al cartoccio", [["f_orata", 250], ["f_pomodorini", 80], ["f_patate", 150], ["f_evo", 10]], "Italiana"],

  // --- Spagnola e portoghese ---
  ["Paella di mare", "🥘", "paella de marisco, paella ai frutti di mare, paella di pesce", [["f_riso", 80], ["f_gamberi", 120], ["f_cozze", 100], ["f_calamari", 100], ["f_piselli", 40], ["f_passata", 40], ["f_evo", 12], ["f_spezie", 1]], "Spagnola"],
  ["Paella valenciana", "🥘", "paella di carne, paella pollo e coniglio", [["f_riso", 80], ["f_coscia_pollo", 150], ["f_coniglio", 100], ["f_fagiolini", 60], ["f_passata", 30], ["f_evo", 12], ["f_spezie", 1]], "Spagnola"],
  ["Pulpo a la gallega", "🐙", "polpo alla galiziana, pulpo gallega", [["f_polpo", 300], ["f_patate", 150], ["f_evo", 15], ["f_spezie", 2]], "Spagnola"],
  ["Gambas al ajillo con pane", "🦐", "gambas al ajillo, gamberi all'aglio", [["f_gamberi", 220], ["f_evo", 20], ["f_aglio", 8], ["f_pane", 60]], "Spagnola"],
  ["Bacalhau à Brás", "🐟", "bacalhau a bras, baccala alla bras", [["f_baccala", 180], ["f_uova", 100], ["f_patate", 120], ["f_cipolla", 40], ["f_olive", 15], ["f_evo", 10]], "Portoghese"],

  // --- Greca, turca e mediorientale ---
  ["Souvlaki di pollo con tzatziki", "🍢", "souvlaki, souvlaki di pollo", [["f_pollo", 180], ["f_yogurt0", 80], ["f_cetrioli", 40], ["f_pane_pita", 70], ["f_pomodori", 50], ["f_evo", 8]], "Greca"],
  ["Moussaka", "🍆", "musaka, mussaka", [["f_macinato", 130], ["f_melanzane", 200], ["f_passata", 80], ["f_besciamella", 80], ["f_parmigiano", 15], ["f_olio_semi", 15]], "Greca"],
  ["Keftedes con tzatziki", "🧆", "keftedes, polpette greche", [["f_macinato", 150], ["f_cipolla", 20], ["f_uova", 25], ["f_pangrattato", 15], ["f_yogurt0", 80], ["f_cetrioli", 40], ["f_pane_pita", 50]], "Greca"],
  ["Halloumi e ceci con insalata", "🧀", "halloumi grigliato, insalata con halloumi", [["f_halloumi", 120], ["f_ceci", 150], ["f_pomodori", 100], ["f_cetrioli", 80], ["f_evo", 8]], "Greca"],
  ["Adana kebab con riso", "🍢", "adana kebab, kebab turco con riso", [["f_macinato", 160], ["f_spezie", 3], ["f_peperoni", 60], ["f_yogurt0", 60], ["f_riso", 60]], "Turca"],
  ["Menemen con feta", "🍳", "menemen, uova alla turca", [["f_uova", 180], ["f_feta", 40], ["f_peperoni", 80], ["f_pomodori", 150], ["f_evo", 10], ["f_pane", 60]], "Turca"],
  ["Joojeh kabab con riso", "🍗", "joojeh kabab, jujeh kabab, pollo allo zafferano", [["f_pollo", 200], ["f_yogurt0", 50], ["f_burro", 10], ["f_spezie", 2], ["f_riso_basmati", 70]], "Persiana"],
  ["Chelo kabab koobideh", "🍢", "koobideh, kabab koobideh", [["f_macinato", 160], ["f_cipolla", 30], ["f_burro", 10], ["f_pomodori", 100], ["f_riso_basmati", 70]], "Persiana"],
  ["Fattoush con pollo grigliato", "🥗", "fattoush, fattush", [["f_pollo", 160], ["f_insalata", 100], ["f_pomodori", 80], ["f_cetrioli", 60], ["f_pane_pita", 40], ["f_evo", 12]], "Libanese"],
  ["Falafel bowl con hummus e halloumi", "🧆", "falafel bowl, falafel", [["f_ceci_secchi", 60], ["f_hummus", 50], ["f_halloumi", 60], ["f_yogurt0", 80], ["f_insalata", 80], ["f_pane_pita", 40], ["f_olio_semi", 10]], "Mediorientale"],

  // --- Nord Africa e Africa ---
  ["Tajine di pollo con olive e limone", "🥘", "tajine di pollo, tagine di pollo", [["f_coscia_pollo", 220], ["f_cipolla", 60], ["f_olive", 20], ["f_evo", 10], ["f_spezie", 4], ["f_cous", 60]], "Marocchina"],
  ["Couscous con agnello e ceci", "🥘", "couscous di agnello, cuscus marocchino", [["f_cous", 70], ["f_agnello", 150], ["f_ceci", 100], ["f_carote", 60], ["f_zucchine", 80], ["f_spezie", 3], ["f_evo", 8]], "Marocchina"],
  ["Tajine di kefta con uova", "🍳", "kefta tajine, tajine di polpette", [["f_macinato", 150], ["f_uova", 60], ["f_passata", 150], ["f_cipolla", 30], ["f_spezie", 3], ["f_pane", 50]], "Marocchina"],
  ["Harira", "🍲", "zuppa harira", [["f_lenticchie_secche", 40], ["f_ceci", 80], ["f_agnello", 100], ["f_passata", 100], ["f_cipolla", 30], ["f_evo", 5]], "Marocchina"],
  ["Doro wat con injera", "🍗", "doro wat, doro wot, pollo etiope", [["f_coscia_pollo", 200], ["f_uova", 60], ["f_cipolla", 100], ["f_ghee", 15], ["f_spezie", 5], ["f_injera", 120]], "Etiope"],
  ["Jollof rice con pollo", "🍚", "jollof, riso jollof", [["f_riso", 80], ["f_coscia_pollo", 200], ["f_passata", 100], ["f_peperoni", 60], ["f_cipolla", 40], ["f_olio_semi", 10], ["f_spezie", 3]], "Africa occidentale"],
  ["Suya di manzo", "🍢", "suya, spiedini suya", [["f_manzo", 200], ["f_arachidi", 20], ["f_spezie", 4], ["f_cipolla", 30], ["f_pomodori", 60]], "Africa occidentale"],
  ["Maafe di pollo", "🥜", "maafe, mafe, stufato di arachidi", [["f_pollo", 170], ["f_burroarachidi", 30], ["f_passata", 100], ["f_patate_dolci", 100], ["f_cipolla", 40], ["f_riso", 50]], "Africa occidentale"],
  ["Bobotie con riso", "🥧", "bobotie", [["f_macinato", 160], ["f_uova", 50], ["f_latte", 50], ["f_pane", 20], ["f_cipolla", 40], ["f_uvetta", 10], ["f_spezie", 3], ["f_riso", 50]], "Sudafricana"],

  // --- Americhe ---
  ["Tacos al pastor", "🌮", "tacos, al pastor, tacos di maiale", [["f_tortilla_mais", 90], ["f_maiale", 150], ["f_ananas", 40], ["f_cipolla", 20], ["f_spezie", 3]], "Messicana"],
  ["Burrito bowl di pollo", "🥙", "burrito bowl, bowl messicana", [["f_riso", 60], ["f_pollo", 170], ["f_fagioli", 100], ["f_mais", 40], ["f_pomodori", 60], ["f_avocado", 40], ["f_cheddar", 15]], "Messicana"],
  ["Enchiladas di pollo", "🌯", "enchiladas", [["f_tortilla", 105], ["f_pollo", 150], ["f_passata", 120], ["f_cheddar", 30], ["f_yogurt0", 40]], "Messicana"],
  ["Quesadilla di pollo", "🫓", "quesadilla, quesadillas", [["f_tortilla", 70], ["f_pollo", 130], ["f_cheddar", 40], ["f_peperoni", 50]], "Messicana"],
  ["Tacos di pesce", "🌮", "fish tacos, tacos di merluzzo", [["f_tortilla_mais", 90], ["f_merluzzo", 180], ["f_cavolo_cappuccio", 60], ["f_yogurt0", 40], ["f_avocado", 30], ["f_olio_semi", 5]], "Messicana"],
  ["Carne asada con fagioli", "🥩", "carne asada", [["f_manzo", 200], ["f_fagioli", 120], ["f_tortilla_mais", 60], ["f_cipolla", 30], ["f_pomodori", 60]], "Messicana"],
  ["Ceviche di branzino", "🐟", "ceviche, cebiche", [["f_branzino", 200], ["f_cipolla", 40], ["f_patate_dolci", 100], ["f_mais", 40]], "Peruviana"],
  ["Lomo saltado", "🥩", "lomo saltado", [["f_manzo", 180], ["f_cipolla", 60], ["f_pomodori", 80], ["f_salsa_soia", 15], ["f_olio_semi", 10], ["f_patatine_forno", 100], ["f_riso", 50]], "Peruviana"],
  ["Pollo a la brasa", "🍗", "pollo alla brace peruviano, pollo brasa", [["f_coscia_pollo", 250], ["f_spezie", 3], ["f_patatine_forno", 150], ["f_insalata", 80]], "Peruviana"],
  ["Picanha con riso e fagioli", "🥩", "picanha", [["f_manzo", 200], ["f_riso", 60], ["f_fagioli", 100], ["f_cipolla", 20]], "Brasiliana"],
  ["Feijoada", "🫘", "feijoada", [["f_fagioli", 150], ["f_maiale", 120], ["f_salsiccia", 50], ["f_cipolla", 30], ["f_riso", 60]], "Brasiliana"],
  ["Moqueca di pesce", "🍲", "moqueca, moqueca de peixe", [["f_merluzzo", 200], ["f_gamberi", 80], ["f_latte_cocco", 60], ["f_peperoni", 60], ["f_pomodori", 60], ["f_riso", 60]], "Brasiliana"],
  ["Asado con chimichurri", "🥩", "asado, chimichurri, bistecca al chimichurri", [["f_manzo", 250], ["f_prezzemolo", 15], ["f_evo", 15], ["f_aglio", 3], ["f_insalata", 100]], "Argentina"],
  ["Pollo jerk con riso e fagioli", "🍗", "jerk chicken, pollo jerk", [["f_coscia_pollo", 200], ["f_spezie", 5], ["f_olio_semi", 5], ["f_riso", 60], ["f_fagioli", 100]], "Caraibica"],
  ["Pollo BBQ con patate dolci", "🍗", "pollo barbecue, bbq chicken", [["f_pollo", 200], ["f_salsa_bbq", 30], ["f_patate_dolci", 200], ["f_olio_semi", 5]], "Americana"],
  ["Pulled pork burger", "🍔", "pulled pork, panino pulled pork", [["f_panino_burger", 80], ["f_maiale", 150], ["f_salsa_bbq", 30], ["f_cavolo_cappuccio", 60], ["f_yogurt0", 30]], "Americana"],
  ["Cobb salad", "🥗", "insalata cobb", [["f_lattuga", 120], ["f_pollo", 150], ["f_uova", 60], ["f_avocado", 40], ["f_pomodori", 60], ["f_speck", 20], ["f_feta", 20]], "Americana"],
  ["Chili di tacchino", "🌶️", "turkey chili, chili di tacchino e fagioli", [["f_tacchino", 150], ["f_fagioli", 120], ["f_passata", 150], ["f_cipolla", 40], ["f_spezie", 4], ["f_evo", 5]], "Americana"],
  ["Steak and eggs", "🥩", "bistecca e uova, steak & eggs", [["f_manzo", 200], ["f_uova", 120], ["f_patate", 150], ["f_burro", 5]], "Americana"],
  ["Omelette di albumi con fiocchi di latte", "🍳", "egg white omelette, omelette di albumi", [["f_albume", 250], ["f_uova", 60], ["f_spinaci", 80], ["f_funghi", 80], ["f_fiocchi", 80], ["f_pane_integrale", 50]], "Americana"],
  ["Poke di tonno", "🥗", "ahi poke, poke tonno, poke al tonno", [["f_riso", 80], ["f_tonno_fresco", 130], ["f_edamame", 50], ["f_avocado", 30], ["f_cetrioli", 40], ["f_salsa_soia", 10]], "Hawaiana"],

  // --- Europa ---
  ["Fish and chips al forno", "🐟", "fish and chips, fish & chips", [["f_merluzzo", 200], ["f_uova", 20], ["f_pangrattato", 25], ["f_olio_semi", 10], ["f_patatine_forno", 150], ["f_piselli", 80]], "Britannica"],
  ["Shepherd's pie", "🥧", "shepherds pie, cottage pie, pasticcio del pastore", [["f_macinato", 150], ["f_carote", 50], ["f_piselli", 50], ["f_cipolla", 30], ["f_patate", 200], ["f_latte", 30], ["f_burro", 5]], "Britannica"],
  ["Coq au vin", "🍷", "coq au vin, pollo al vino", [["f_coscia_pollo", 220], ["f_funghi", 80], ["f_cipolla", 40], ["f_guanciale", 15], ["f_vino", 60], ["f_patate", 150]], "Francese"],
  ["Bœuf bourguignon", "🍷", "boeuf bourguignon, manzo alla borgognona", [["f_manzo", 200], ["f_carote", 60], ["f_funghi", 60], ["f_cipolla", 40], ["f_vino", 80], ["f_evo", 8], ["f_patate", 150]], "Francese"],
  ["Insalata nizzarda", "🥗", "salade nicoise, nicoise, insalata nicoise", [["f_tonno", 120], ["f_uova", 100], ["f_fagiolini", 100], ["f_patate", 100], ["f_pomodori", 80], ["f_olive", 15], ["f_evo", 10]], "Francese"],
  ["Gulasch con patate", "🍲", "goulash, gulash, gulasch ungherese", [["f_manzo", 200], ["f_cipolla", 80], ["f_peperoni", 60], ["f_passata", 50], ["f_spezie", 5], ["f_evo", 8], ["f_patate", 150]], "Ungherese"],
  ["Pollo paprikash", "🍗", "paprikash, csirkepaprikás", [["f_coscia_pollo", 200], ["f_cipolla", 60], ["f_yogurt", 60], ["f_spezie", 5], ["f_evo", 5], ["f_pasta_uovo", 60]], "Ungherese"],
  ["Shashlik di maiale", "🍢", "shashlik, spiedini russi", [["f_maiale", 220], ["f_cipolla", 50], ["f_insalata", 80], ["f_pane", 50]], "Russa"],
  ["Salmone affumicato con patate e skyr", "🐟", "gravlax con patate, salmone nordico", [["f_salmone_aff", 100], ["f_patate", 200], ["f_skyr", 100], ["f_pane_segale", 50]], "Scandinava"],
  ["Polpette svedesi con purè", "🧆", "kottbullar, köttbullar, polpette svedesi", [["f_macinato", 150], ["f_uova", 25], ["f_pangrattato", 15], ["f_panna", 30], ["f_patate", 200], ["f_latte", 30]], "Scandinava"],

  // --- Asia meridionale ---
  ["Chicken tikka con naan", "🍢", "chicken tikka, pollo tikka secco", [["f_pollo", 200], ["f_yogurt0", 60], ["f_spezie", 5], ["f_cipolla", 30], ["f_naan", 80]], "Indiana"],
  ["Keema matar con riso", "🍛", "keema, keema matar, kheema", [["f_macinato", 150], ["f_piselli", 80], ["f_cipolla", 50], ["f_passata", 80], ["f_ghee", 5], ["f_spezie", 4], ["f_riso_basmati", 60]], "Indiana"],
  ["Fish curry di Goa", "🐟", "fish curry, curry di pesce", [["f_merluzzo", 220], ["f_latte_cocco", 60], ["f_cipolla", 40], ["f_passata", 60], ["f_spezie", 4], ["f_riso_basmati", 60]], "Indiana"],
  ["Gamberi tandoori con riso", "🦐", "tandoori prawns, gamberi tandoori", [["f_gamberi", 220], ["f_yogurt0", 50], ["f_spezie", 4], ["f_olio_semi", 5], ["f_riso_basmati", 60]], "Indiana"],
  ["Paneer tikka con naan", "🧀", "paneer tikka", [["f_paneer", 150], ["f_yogurt0", 60], ["f_peperoni", 80], ["f_cipolla", 40], ["f_spezie", 3], ["f_naan", 60]], "Indiana"],
  ["Chicken karahi con naan", "🍛", "karahi, kadai chicken, chicken karahi", [["f_pollo", 200], ["f_pomodori", 150], ["f_ghee", 10], ["f_spezie", 5], ["f_naan", 80]], "Pakistana"],

  // --- Giappone ---
  ["Tonkatsu con riso", "🐖", "tonkatsu, cotoletta giapponese", [["f_maiale", 180], ["f_uova", 20], ["f_pangrattato", 25], ["f_olio_semi", 15], ["f_cavolo_cappuccio", 80], ["f_riso", 70]], "Giapponese"],
  ["Yakitori con riso", "🍢", "yakitori, spiedini giapponesi", [["f_coscia_pollo", 200], ["f_teriyaki", 25], ["f_riso", 70]], "Giapponese"],
  ["Gyudon", "🥩", "gyudon, gyu don, beef bowl", [["f_manzo", 150], ["f_cipolla", 60], ["f_salsa_soia", 15], ["f_zucchero", 5], ["f_uova", 50], ["f_riso", 80]], "Giapponese"],
  ["Soba con pollo ed edamame", "🍜", "soba al pollo, soba con pollo", [["f_soba", 80], ["f_pollo", 150], ["f_edamame", 60], ["f_salsa_soia", 15]], "Giapponese"],
  ["Katsu curry", "🍛", "katsu curry, curry giapponese", [["f_pollo", 170], ["f_uova", 20], ["f_pangrattato", 25], ["f_olio_semi", 15], ["f_cipolla", 40], ["f_carote", 40], ["f_farina", 10], ["f_spezie", 4], ["f_riso", 70]], "Giapponese"],
  ["Salmone glassato al miso con riso", "🍣", "miso salmon, salmone al miso", [["f_salmone", 160], ["f_miso", 15], ["f_riso", 70], ["f_pak_choi", 100]], "Giapponese"],
  ["Okonomiyaki con gamberi", "🥞", "okonomiyaki", [["f_farina", 50], ["f_uova", 100], ["f_cavolo_cappuccio", 150], ["f_gamberi", 100], ["f_maionese", 10]], "Giapponese"],
  ["Tofu croccante con edamame e riso", "🍱", "tofu croccante, tofu bowl", [["f_tofu", 250], ["f_edamame", 80], ["f_salsa_soia", 15], ["f_olio_semi", 8], ["f_riso", 60]], "Giapponese"],

  // --- Cina ---
  ["Pollo al limone con riso", "🍋", "pollo al limone cinese, lemon chicken", [["f_pollo", 180], ["f_farina", 15], ["f_olio_semi", 12], ["f_zucchero", 10], ["f_riso", 70]], "Cinese"],
  ["Char siu con riso", "🐖", "char siu, maiale laccato cinese", [["f_maiale", 180], ["f_miele", 15], ["f_salsa_soia", 15], ["f_pak_choi", 100], ["f_riso", 70]], "Cinese"],
  ["Pollo alle mandorle con riso", "🍗", "pollo alle mandorle", [["f_pollo", 170], ["f_mandorle", 20], ["f_cipolla", 40], ["f_salsa_soia", 15], ["f_olio_semi", 10], ["f_riso", 70]], "Cinese"],
  ["Manzo al pepe nero con riso", "🥩", "manzo al pepe nero, black pepper beef", [["f_manzo", 170], ["f_peperoni", 80], ["f_cipolla", 40], ["f_salsa_soia", 15], ["f_salsa_ostrica", 10], ["f_olio_semi", 10], ["f_riso", 70]], "Cinese"],
  ["Ravioli di maiale al vapore", "🥟", "jiaozi, ravioli cinesi, dumplings di maiale, dumpling", [["f_farina", 70], ["f_maiale", 130], ["f_cavolo_cappuccio", 50], ["f_salsa_soia", 10]], "Cinese"],
  ["Branzino al vapore con zenzero", "🐟", "pesce al vapore cinese, branzino al vapore", [["f_branzino", 250], ["f_salsa_soia", 15], ["f_olio_semi", 8], ["f_pak_choi", 100], ["f_riso", 70]], "Cinese"],
  ["Seitan saltato con broccoli", "🥦", "seitan con broccoli, seitan saltato", [["f_seitan", 180], ["f_broccoli", 150], ["f_salsa_soia", 15], ["f_olio_semi", 10], ["f_riso", 60]], "Cinese"],

  // --- Corea ---
  ["Bulgogi con riso", "🥩", "bulgogi", [["f_manzo", 170], ["f_salsa_soia", 20], ["f_zucchero", 8], ["f_cipolla", 40], ["f_olio_semi", 6], ["f_kimchi", 50], ["f_riso", 70]], "Coreana"],
  ["Dak galbi", "🌶️", "dakgalbi, pollo piccante coreano", [["f_coscia_pollo", 200], ["f_gochujang", 25], ["f_cavolo_cappuccio", 100], ["f_patate_dolci", 80], ["f_olio_semi", 8]], "Coreana"],
  ["Kimchi jjigae con tofu e maiale", "🍲", "kimchi jjigae, zuppa di kimchi", [["f_kimchi", 150], ["f_tofu", 150], ["f_maiale", 100], ["f_brodo", 300], ["f_gochujang", 10], ["f_riso", 60]], "Coreana"],

  // --- Sud-est asiatico ---
  ["Green curry di pollo con riso", "🍛", "green curry, curry verde thai, curry verde", [["f_pollo", 170], ["f_latte_cocco", 100], ["f_melanzane", 80], ["f_spezie", 4], ["f_salsa_pesce", 10], ["f_riso", 70]], "Thailandese"],
  ["Panang curry di manzo", "🍛", "panang, panang curry", [["f_manzo", 170], ["f_latte_cocco", 80], ["f_arachidi", 10], ["f_spezie", 4], ["f_riso", 70]], "Thailandese"],
  ["Gai yang con insalata di papaya", "🍗", "gai yang, pollo grigliato thai, som tam con pollo", [["f_coscia_pollo", 220], ["f_salsa_pesce", 15], ["f_carote", 80], ["f_pomodori", 50], ["f_arachidi", 10], ["f_riso", 60]], "Thailandese"],
  ["Tom kha gai", "🥥", "tom kha, zuppa di pollo al cocco", [["f_pollo", 170], ["f_latte_cocco", 100], ["f_funghi", 80], ["f_brodo", 250], ["f_salsa_pesce", 10]], "Thailandese"],
  ["Pho bo", "🍜", "pho, phở, pho di manzo", [["f_noodles_riso", 80], ["f_manzo", 150], ["f_brodo", 500], ["f_germogli", 50], ["f_cipolla", 30], ["f_salsa_pesce", 10]], "Vietnamita"],
  ["Bun cha", "🍜", "bun cha, bún chả", [["f_maiale", 150], ["f_noodles_riso", 70], ["f_lattuga", 50], ["f_carote", 30], ["f_salsa_pesce", 15], ["f_zucchero", 8]], "Vietnamita"],
  ["Banh mi di pollo", "🥖", "banh mi, bánh mì", [["f_pane", 100], ["f_pollo", 150], ["f_carote", 40], ["f_cetrioli", 30], ["f_maionese", 10]], "Vietnamita"],
  ["Involtini estivi di gamberi", "🦐", "goi cuon, summer rolls, involtini vietnamiti", [["f_noodles_riso", 40], ["f_gamberi", 180], ["f_lattuga", 40], ["f_carote", 30], ["f_burroarachidi", 15]], "Vietnamita"],
  ["Chicken adobo con riso", "🍗", "adobo, pollo adobo", [["f_coscia_pollo", 220], ["f_salsa_soia", 25], ["f_aglio", 8], ["f_olio_semi", 5], ["f_riso", 70]], "Filippina"],
  ["Hainanese chicken rice", "🍚", "chicken rice, riso al pollo hainanese", [["f_pollo", 180], ["f_riso", 80], ["f_brodo", 200], ["f_cetrioli", 50], ["f_salsa_soia", 10]], "Malese"],
  ["Laksa ai gamberi", "🍜", "laksa, curry laksa", [["f_noodles_riso", 70], ["f_gamberi", 120], ["f_tofu", 60], ["f_uova", 50], ["f_latte_cocco", 80], ["f_brodo", 300], ["f_spezie", 4]], "Malese"],
  ["Ayam bakar con riso", "🍗", "ayam bakar, pollo alla griglia indonesiano", [["f_coscia_pollo", 220], ["f_salsa_soia", 15], ["f_zucchero", 8], ["f_olio_semi", 5], ["f_cetrioli", 50], ["f_riso", 70]], "Indonesiana"],
  ["Soto ayam", "🍲", "soto ayam, zuppa di pollo indonesiana", [["f_pollo", 150], ["f_uova", 50], ["f_noodles_riso", 40], ["f_brodo", 400], ["f_germogli", 40], ["f_spezie", 3]], "Indonesiana"],

  /* ========== Dolci proteici dal mondo (sesto campo: "dolce") ==========
     Versioni alleggerite dei classici: skyr, quark, albumi, proteine
     whey o caseine al posto di parte di zucchero, burro e panna. */
  // --- Italiana ---
  ["Tiramisù proteico", "🍰", "tiramisu proteico, tiramisu fit, tiramisu allo skyr", [["f_skyr", 150], ["f_mascarpone", 20], ["f_whey", 20], ["f_savoiardi", 25], ["f_caffe", 40], ["f_cacao", 3], ["f_dolcificante", 5]], "Italiana", "dolce"],
  ["Panna cotta proteica ai frutti rossi", "🍮", "panna cotta proteica, panna cotta fit", [["f_latte_scremato", 150], ["f_whey", 25], ["f_gelatina", 4], ["f_dolcificante", 5], ["f_lamponi", 80]], "Italiana", "dolce"],
  ["Cannolo scomposto con ricotta proteica", "🥮", "cannolo scomposto, cannolo proteico, crema di ricotta", [["f_ricotta", 150], ["f_whey", 15], ["f_biscotti", 20], ["f_cioccolato", 10], ["f_dolcificante", 5]], "Italiana", "dolce"],
  ["Budino al cioccolato proteico", "🍫", "budino proteico, budino al cioccolato fit", [["f_latte_scremato", 250], ["f_caseine", 25], ["f_cacao", 10], ["f_dolcificante", 8]], "Italiana", "dolce"],
  ["Torta di mele proteica", "🍎", "torta di mele fit, torta di mele allo yogurt", [["f_mela", 150], ["f_uova", 50], ["f_albume", 60], ["f_farina", 25], ["f_whey", 15], ["f_yogurt0", 60], ["f_dolcificante", 8]], "Italiana", "dolce"],
  ["Crema al caffè proteica", "☕", "crema caffe proteica, crema al caffe", [["f_skyr", 150], ["f_caffe", 30], ["f_whey", 10], ["f_cacao", 2], ["f_dolcificante", 5]], "Italiana", "dolce"],
  // --- Francese, spagnola, britannica ---
  ["Mousse al cioccolato proteica", "🍫", "mousse au chocolat proteica, mousse al cioccolato fit", [["f_albume", 100], ["f_cioccolato", 25], ["f_skyr", 100], ["f_cacao", 5], ["f_dolcificante", 5]], "Francese", "dolce"],
  ["Crêpes proteiche con skyr e mirtilli", "🥞", "crepes proteiche, crepe proteica", [["f_albume", 100], ["f_uova", 50], ["f_avena", 30], ["f_latte_scremato", 50], ["f_skyr", 100], ["f_mirtilli", 60]], "Francese", "dolce"],
  ["Clafoutis alle ciliegie proteico", "🍒", "clafoutis, clafoutis proteico", [["f_uova", 100], ["f_latte_scremato", 100], ["f_farina", 20], ["f_whey", 15], ["f_ciliegie", 100], ["f_dolcificante", 5]], "Francese", "dolce"],
  ["Flan proteico", "🍮", "flan, crema caramel proteica, creme caramel proteica", [["f_uova", 100], ["f_latte_scremato", 150], ["f_whey", 15], ["f_zucchero", 10]], "Spagnola", "dolce"],
  ["Eton mess proteico", "🍓", "eton mess", [["f_skyr", 150], ["f_albume", 30], ["f_zucchero", 15], ["f_fragole", 120]], "Britannica", "dolce"],
  ["Crumble di mele proteico", "🍏", "crumble di mele, apple crumble", [["f_mela", 150], ["f_avena", 30], ["f_whey", 15], ["f_burro", 8], ["f_skyr", 100]], "Britannica", "dolce"],
  // --- Europa centrale, dell'est e del nord ---
  ["Käsekuchen al quark", "🍰", "kasekuchen, kaesekuchen, torta al quark", [["f_quark", 200], ["f_uova", 50], ["f_farina", 15], ["f_zucchero", 15]], "Tedesca", "dolce"],
  ["Kaiserschmarrn proteico", "🥞", "kaiserschmarrn, frittata dolce austriaca", [["f_uova", 100], ["f_albume", 60], ["f_farina", 30], ["f_latte_scremato", 50], ["f_uvetta", 10], ["f_quark", 80]], "Austriaca", "dolce"],
  ["Syrniki", "🥞", "syrniki, frittelle di tvorog, frittelle di quark", [["f_quark", 200], ["f_uova", 50], ["f_farina", 25], ["f_olio_semi", 5], ["f_skyr", 50]], "Russa", "dolce"],
  ["Skyr con mirtilli e granola", "🫐", "skyr bowl, skyr con mirtilli", [["f_skyr", 250], ["f_mirtilli", 80], ["f_granola", 25], ["f_miele", 10]], "Islandese", "dolce"],
  // --- Mediterraneo e Medio Oriente ---
  ["Yogurt greco con miele e noci", "🍯", "yogurt miele e noci, yiaourti me meli", [["f_yogurt0", 250], ["f_miele", 15], ["f_noci", 15]], "Greca", "dolce"],
  ["Muhallebi proteico al pistacchio", "🍮", "muhallebi, mahalabia, budino al latte mediorientale", [["f_latte_scremato", 250], ["f_caseine", 20], ["f_farina", 10], ["f_pistacchi", 10], ["f_dolcificante", 5]], "Turca", "dolce"],
  ["Labneh con datteri e pistacchi", "🌴", "labneh dolce, labneh con datteri", [["f_yogurt", 200], ["f_datteri", 30], ["f_pistacchi", 10]], "Libanese", "dolce"],
  // --- Asia ---
  ["Shrikhand", "🍨", "shrikhand, yogurt allo zafferano", [["f_yogurt0", 250], ["f_zucchero", 15], ["f_pistacchi", 10], ["f_spezie", 1]], "Indiana", "dolce"],
  ["Rasmalai proteico", "🍮", "rasmalai, ras malai", [["f_paneer", 100], ["f_latte_scremato", 150], ["f_whey", 10], ["f_pistacchi", 10], ["f_dolcificante", 5]], "Indiana", "dolce"],
  ["Kheer proteico", "🍚", "kheer, budino di riso indiano", [["f_riso", 30], ["f_latte_scremato", 250], ["f_caseine", 20], ["f_mandorle", 10], ["f_spezie", 1], ["f_dolcificante", 5]], "Indiana", "dolce"],
  ["Dorayaki proteici", "🥞", "dorayaki", [["f_uova", 50], ["f_albume", 60], ["f_farina", 30], ["f_whey", 15], ["f_azuki", 30], ["f_miele", 10]], "Giapponese", "dolce"],
  ["Cheesecake giapponese proteica", "🍰", "japanese cheesecake, cheesecake soffice, cotton cheesecake", [["f_uova", 100], ["f_quark", 120], ["f_farina", 10], ["f_latte_scremato", 30], ["f_dolcificante", 10]], "Giapponese", "dolce"],
  ["Budino al mango proteico", "🥭", "mango pudding, budino al mango", [["f_mango", 150], ["f_latte_scremato", 100], ["f_gelatina", 4], ["f_whey", 20]], "Cinese", "dolce"],
  ["Douhua con sciroppo", "🍮", "douhua, tofu pudding, budino di tofu", [["f_tofu", 250], ["f_zucchero", 15]], "Cinese", "dolce"],
  ["Bingsu proteico con azuki e fragole", "🍧", "bingsu, patbingsu", [["f_latte_scremato", 200], ["f_whey", 20], ["f_azuki", 30], ["f_fragole", 80]], "Coreana", "dolce"],
  ["Mango sticky rice proteico", "🥭", "mango sticky rice, khao niao mamuang", [["f_riso", 50], ["f_latte_cocco", 40], ["f_mango", 150], ["f_skyr", 100], ["f_whey", 15]], "Thailandese", "dolce"],
  // --- Americhe e Oceania ---
  ["Churros proteici al forno con crema al cacao", "🥖", "churros, churros proteici", [["f_farina", 30], ["f_whey", 20], ["f_albume", 60], ["f_skyr", 80], ["f_cacao", 5], ["f_dolcificante", 5]], "Messicana", "dolce"],
  ["Tres leches proteica", "🍰", "tres leches, torta tres leches", [["f_uova", 50], ["f_farina", 25], ["f_whey", 15], ["f_latte_scremato", 100], ["f_skyr", 80], ["f_fragole", 50], ["f_dolcificante", 5]], "Messicana", "dolce"],
  ["Brigadeiro proteici", "🍫", "brigadeiro, brigadeiros", [["f_whey", 30], ["f_cacao", 10], ["f_latte_scremato", 30], ["f_burro", 5], ["f_dolcificante", 5]], "Brasiliana", "dolce"],
  ["Açaí bowl proteica", "🫐", "acai bowl, açaí bowl, acai", [["f_mirtilli", 100], ["f_banana", 80], ["f_whey", 25], ["f_granola", 25]], "Brasiliana", "dolce"],
  ["Cheesecake New York proteica", "🍰", "cheesecake, new york cheesecake, cheesecake proteica", [["f_skyr", 150], ["f_fiocchi", 100], ["f_uova", 50], ["f_whey", 15], ["f_biscotti", 20], ["f_burro", 5], ["f_dolcificante", 10]], "Americana", "dolce"],
  ["Brownies proteici", "🍫", "brownies, brownie proteico", [["f_uova", 50], ["f_albume", 60], ["f_cacao", 15], ["f_whey", 20], ["f_avena", 20], ["f_burroarachidi", 10], ["f_cioccolato", 10], ["f_dolcificante", 10]], "Americana", "dolce"],
  ["Pancake proteici con mirtilli", "🥞", "protein pancakes, pancake con whey", [["f_avena", 50], ["f_albume", 120], ["f_uova", 50], ["f_whey", 15], ["f_mirtilli", 60]], "Americana", "dolce"],
  ["Cookie proteici al burro d'arachidi", "🍪", "cookie proteici, biscotti proteici, protein cookies", [["f_avena", 30], ["f_whey", 25], ["f_burroarachidi", 15], ["f_albume", 30], ["f_cioccolato", 10]], "Americana", "dolce"],
  ["Banana bread proteico", "🍌", "banana bread", [["f_banana", 80], ["f_uova", 50], ["f_avena", 35], ["f_whey", 20], ["f_skyr", 50]], "Americana", "dolce"],
  ["Mug cake proteica al cioccolato", "☕", "mug cake, torta in tazza", [["f_albume", 60], ["f_whey", 25], ["f_cacao", 8], ["f_avena", 15], ["f_latte_scremato", 30]], "Americana", "dolce"],
  ["Chia pudding proteico ai lamponi", "🍓", "chia pudding, budino di chia", [["f_semi_chia", 25], ["f_latte_scremato", 200], ["f_whey", 20], ["f_lamponi", 80]], "Americana", "dolce"],
  ["Frozen yogurt proteico ai frutti di bosco", "🍦", "frozen yogurt, froyo", [["f_yogurt0", 200], ["f_whey", 15], ["f_mirtilli", 100], ["f_dolcificante", 5]], "Americana", "dolce"],
  ["Nice cream proteica alla banana", "🍨", "nice cream, gelato alla banana, gelato proteico", [["f_banana", 120], ["f_whey", 25], ["f_burroarachidi", 10], ["f_latte_scremato", 50]], "Americana", "dolce"],
  ["Pavlova proteica", "🍓", "pavlova", [["f_albume", 90], ["f_zucchero", 20], ["f_skyr", 150], ["f_fragole", 60], ["f_kiwi", 60]], "Australiana", "dolce"],
  ["Bliss balls proteiche datteri e anacardi", "🟤", "bliss balls, energy balls, palline proteiche", [["f_datteri", 30], ["f_anacardi", 20], ["f_whey", 20], ["f_cocco", 5]], "Australiana", "dolce"],
  ["Mousse di tofu al cacao", "🍫", "mousse vegana, mousse di tofu", [["f_tofu", 200], ["f_cacao", 10], ["f_datteri", 20], ["f_latte_soia", 50]], "Internazionale", "dolce"],
];
