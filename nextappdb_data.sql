--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
33fd1579-7641-4013-9ca3-9659c5bb7e69	9f072aed8ba3e5a893189706dad61d0bda5b928514f46ace266c2cc5b71d0366	2025-07-06 21:16:04.931845+02	20250706211000_initial_db_setup		\N	2025-07-06 21:16:04.931845+02	0
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.categories (category_id, name, type) FROM stdin;
1	PARTAGER	dish
2	FINGERS FOOD	dish
3	SALADES	dish
4	POISSONS	dish
5	SOUPE DU MOMENT	dish
6	BURGERS avec FRITES MAISON	dish
7	VIANDES	dish
8	DESSERTS	dish
9	KIDS MENU	dish
10	vins blancs	drink
11	vins rouges	drink
12	vins rose	drink
13	bubbles	drink
14	softs	drink
15	waters	drink
16	juices	drink
17	draft beers	drink
18	bottled beers	drink
19	aperitifs	drink
20	shots	drink
21	digestifs	drink
22	gin tonics	drink
23	cocktails signature	drink
24	cocktails	drink
25	mocktails	drink
26	make up your longdrink	drink
27	hot drinks	drink
28	hot teas	drink
29	White Wines	drink
30	Red Wines	drink
31	Ros├® Wines	drink
\.


--
-- Data for Name: dishes; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.dishes (dish_id, name, price_eur, record_date, image) FROM stdin;
1	Planche de fromage	18.00	2025-05-29	\N
2	Planche de charcuterie	19.50	2025-05-29	\N
4	Chili Chicken Wings "Good Bye My Lips" (4pc)	9.00	2025-05-29	\N
5	Houmous	6.50	2025-05-29	\N
6	Salade Cesar Poulet (small)	12.00	2025-05-29	\N
7	Salade Cesar Poulet (large)	18.00	2025-05-29	\N
8	Filet de saumon frais grille	23.00	2025-05-29	\N
9	Scampis grilles a l'ail	22.00	2025-05-29	\N
10	Soupe du Moment (small)	12.00	2025-05-29	\N
11	Soupe du Moment (large)	14.00	2025-05-29	\N
14	Bronx Burger	23.00	2025-05-29	\N
15	Double Bronx Burger	26.40	2025-05-29	\N
16	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr	25.90	2025-05-29	\N
17	Pavlova fraises fraiches, creme de pistache, meringue	12.00	2025-05-29	\N
18	Planchette "Fingers Food" et frites fraiches	29.00	2025-05-29	\N
19	Nuggets Maison sauce tartare	7.50	2025-06-01	\N
20	Chili Chicken Wings "Good Bye My Lips" (8pc)	16.00	2025-06-01	\N
12	Cheeseburger	21.50	2025-05-29	/images/cheeseburger.PNG
13	Double Cheeseburger	24.90	2025-05-29	/images/doublecheeseburger.jpg
3	Camembert roti au miel, toasts	15.50	2025-05-29	/images/camembertRoti.jpg
\.


--
-- Data for Name: categories_dishes; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.categories_dishes (category_id, dish_id) FROM stdin;
1	1
1	2
1	3
2	4
2	5
3	6
3	7
4	8
4	9
5	10
5	11
6	12
6	13
6	14
6	15
7	16
8	17
2	18
2	19
2	20
\.


--
-- Data for Name: drinks; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.drinks (drink_id, name, record_date, image) FROM stdin;
1	La Plume Blanche "Henri RUPPERT"	2025-06-01	\N
2	Simon Pils	2025-06-01	\N
3	Aperol Spritz	2025-06-01	\N
4	Hendrick's	2025-06-01	\N
5	Rosport Blue	2025-06-01	\N
6	Rosport Viva	2025-06-01	\N
7	Coca-Cola ZERO SUGAR	2025-06-01	\N
8	Coca-Cola	2025-06-01	\N
9	Fanta Orange	2025-06-01	\N
10	Sprite	2025-06-01	\N
11	Fuze Tea Peach Hibiscus	2025-06-01	\N
12	Fuze Tea Mango Chamomile	2025-06-01	\N
13	Royal Bliss Tonic Water	2025-06-01	\N
14	Royal Bliss Bitter Lemon	2025-06-01	\N
15	Royal Bliss Agrumes & Ylang Ylang	2025-06-01	\N
16	Ginger Beer	2025-06-01	\N
17	Supplement sirop	2025-06-01	\N
18	Rosport Classic	2025-06-01	\N
19	Bionade Lemon	2025-06-01	\N
20	Bionade Ginger-Orange	2025-06-01	\N
21	Jus orange/apple/tomate	2025-06-01	\N
22	ApfelSchorle	2025-06-01	\N
23	Fresh orange juice bio	2025-06-01	\N
24	Okult Blanche Bio (White Beer)	2025-06-01	\N
25	IPA (Craft Beer)	2025-06-01	\N
26	Stout (Dark Beer)	2025-06-01	\N
27	Celtic Cider	2025-06-01	\N
28	Panach├® Coca-Cola	2025-06-01	\N
29	Panach├® limonade	2025-06-01	\N
30	Monaco	2025-06-01	\N
31	Tango	2025-06-01	\N
32	Picon bi├¿re	2025-06-01	\N
33	Simon 0%	2025-06-01	\N
34	Simon 0% Lime Ginger	2025-06-01	\N
35	Simon R├®gal	2025-06-01	\N
36	Simon Triple	2025-06-01	\N
37	Simon Dinkel	2025-06-01	\N
38	Waissen Ourdaller Bio	2025-06-01	\N
39	Wellen Ourdaller Bio	2025-06-01	\N
40	Chimay Rouge 7%	2025-06-01	\N
41	Chimay Bleue 9%	2025-06-01	\N
42	Chimay Verte 10%	2025-06-01	\N
43	Leffe Blonde	2025-06-01	\N
44	Leffe Brune	2025-06-01	\N
45	Leffe Ruby	2025-06-01	\N
46	La Chouffe	2025-06-01	\N
47	Mc Chouffe	2025-06-01	\N
48	Chouffe Lite 4%	2025-06-01	\N
49	Kwak 8%	2025-06-01	\N
50	Orval	2025-06-01	\N
51	Duvel Clip	2025-06-01	\N
52	Sol	2025-06-01	\N
53	Heineken	2025-06-01	\N
54	Erdinger	2025-06-01	\N
55	Aperol Spritz sans alcool	2025-06-01	\N
56	Campari Spritz	2025-06-01	\N
57	Limoncello Spritz	2025-06-01	\N
58	Hugo	2025-06-01	\N
59	Ricard	2025-06-01	\N
60	Porto Rouge	2025-06-01	\N
61	Porto Blanc	2025-06-01	\N
62	Campari sec	2025-06-01	\N
63	Cynar sec	2025-06-01	\N
64	Martini Rouge	2025-06-01	\N
65	Martini Blanc	2025-06-01	\N
66	Coupe cr├®mant	2025-06-01	\N
67	Coupe prosecco	2025-06-01	\N
68	Coupe champagne	2025-06-01	\N
69	Kir vin Blanc	2025-06-01	\N
70	Kir Cremant	2025-06-01	\N
71	Kir Royale	2025-06-01	\N
72	Crodino	2025-06-01	\N
73	San Bitter	2025-06-01	\N
74	Regular	2025-06-01	\N
75	Superior	2025-06-01	\N
76	Disaronno Amaretto	2025-06-01	\N
77	Limoncello	2025-06-01	\N
78	Averna	2025-06-01	\N
79	Amaro Del Capo	2025-06-01	\N
80	J├ñgermeister	2025-06-01	\N
81	Grappa Barricata	2025-06-01	\N
82	Baileys	2025-06-01	\N
83	Sambuca	2025-06-01	\N
84	Calvados Vieux P├¿re	2025-06-01	\N
85	Hunneg-Dropp	2025-06-01	\N
86	Mirabelle	2025-06-01	\N
87	Poire Williams	2025-06-01	\N
88	Get 27	2025-06-01	\N
89	Cointreau	2025-06-01	\N
90	Gibson's	2025-06-01	\N
91	Bombay	2025-06-01	\N
92	Mare	2025-06-01	\N
93	Monkey	2025-06-01	\N
94	Gin Sans Alcool	2025-06-01	\N
95	Ooooh My Deer	2025-06-01	\N
96	The Star is Porn Martini	2025-06-01	\N
97	Espresso Martini	2025-06-01	\N
98	Rossini	2025-06-01	\N
99	Moscow Mule	2025-06-01	\N
100	London Mule	2025-06-01	\N
101	Mojito	2025-06-01	\N
102	Caipirinha	2025-06-01	\N
103	Margarita	2025-06-01	\N
104	Daikiri	2025-06-01	\N
105	Negroni	2025-06-01	\N
106	Americano	2025-06-01	\N
107	Paloma	2025-06-01	\N
108	Bloody Mary	2025-06-01	\N
109	Virgin Mojito	2025-06-01	\N
110	Virgin Gin	2025-06-01	\N
111	Virgin Fruity	2025-06-01	\N
112	J&B	2025-06-01	\N
113	Jameson	2025-06-01	\N
114	Jack Daniel's	2025-06-01	\N
115	Bushmills Malt 10 ans	2025-06-01	\N
116	Talisker 10 ans	2025-06-01	\N
117	Aberlour 12 ans	2025-06-01	\N
118	Lagavulin 16 ans	2025-06-01	\N
119	Rhum Kraken	2025-06-01	\N
120	Havana 3 ans	2025-06-01	\N
121	Havana 7 ans	2025-06-01	\N
122	Diplomatico	2025-06-01	\N
123	Zacapa	2025-06-01	\N
124	Vodka	2025-06-01	\N
125	Tequila Cuervo Silver	2025-06-01	\N
126	Malibu	2025-06-01	\N
127	Caf├®	2025-06-01	\N
128	Espresso bio	2025-06-01	\N
129	Caf├® Macchiato bio	2025-06-01	\N
130	Espresso macchiato bio	2025-06-01	\N
131	Cappuccino bio	2025-06-01	\N
132	Caf├® au lait regular	2025-06-01	\N
133	Caf├® au lait d'Avoine (Oat)	2025-06-01	\N
134	Double espresso bio	2025-06-01	\N
135	Latte macchiato bio	2025-06-01	\N
136	Hot chocolate	2025-06-01	\N
137	Lait chaud	2025-06-01	\N
138	Iced Coffee bio	2025-06-01	\N
139	Supplement chantilly	2025-06-01	\N
140	Infusions Fraiches	2025-06-01	\N
141	Th├®s	2025-06-01	\N
142	Black Tea Earl Grey	2025-06-01	\N
143	Black Tea English Breakfast	2025-06-01	\N
144	Green tea	2025-06-01	\N
145	Chardonnay (FR)	2025-06-01	\N
146	Chardonnay Veilles Vignes (FR)	2025-06-01	\N
147	Chateauneuf du Pape (FR)	2025-06-01	\N
148	Pinot Gris Vignum (LUX)	2025-06-01	\N
149	Riesling Clos des Rochers (LUX)	2025-06-01	\N
150	Rivaner Haremillen (LUX)	2025-06-01	\N
151	La Plume Blanche Henri Ruppert	2025-06-01	\N
152	C├┤tes-du-Rh├┤ne (FR)	2025-06-01	\N
153	Primitivo Papale (IT)	2025-06-01	\N
154	Saint-Emilion (FR)	2025-06-01	\N
155	Gigondas (FR)	2025-06-01	\N
156	Ch├óteauneuf du Pape	2025-06-01	\N
157	Ch├óteau Paradis Aix en Pce	2025-06-01	\N
158	Bandol	2025-06-01	\N
159	Miraval	2025-06-01	\N
160	Blanc Gris G├®rerd Bertrand	2025-06-01	\N
161	Cr├®mant 'Esprit de Schengen' (LUX)	2025-06-01	\N
162	Prosecco (IT)	2025-06-01	\N
163	Champagne du Moment (FR)	2025-06-01	\N
\.


--
-- Data for Name: categories_drinks; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.categories_drinks (category_id, drink_id) FROM stdin;
10	1
17	2
19	3
22	4
15	5
15	6
14	7
14	8
14	9
14	10
14	11
14	12
14	13
14	14
14	15
14	16
14	17
15	18
16	19
16	20
16	21
16	22
16	23
17	24
17	25
17	26
17	27
17	28
17	29
17	30
17	31
17	32
18	33
18	34
18	35
18	36
18	37
18	38
18	39
18	40
18	41
18	42
18	43
18	44
18	45
18	46
18	47
18	48
18	49
18	50
18	51
18	52
18	53
18	54
19	55
19	56
19	57
19	58
19	59
19	60
19	61
19	62
19	63
19	64
19	65
19	66
19	67
19	68
19	69
19	70
19	71
19	72
19	73
20	74
20	75
21	76
21	77
21	78
21	79
21	80
21	81
21	82
21	83
21	84
21	85
21	86
21	87
21	88
21	89
22	90
22	91
22	92
22	93
22	94
23	95
23	96
23	97
24	98
24	99
24	100
24	101
24	102
24	103
24	104
24	105
24	106
24	107
24	108
25	109
25	110
25	111
25	55
26	112
26	113
26	114
26	115
26	116
26	117
26	118
26	119
26	120
26	121
26	122
26	123
26	124
26	125
26	126
27	127
27	128
27	129
27	130
27	131
27	132
27	133
27	134
27	135
27	136
27	137
27	138
27	139
28	140
28	141
28	142
28	143
28	144
29	145
29	146
29	147
29	148
29	149
29	150
29	151
30	152
30	153
30	154
30	155
30	156
31	157
31	158
31	159
31	160
13	161
13	162
13	163
\.


--
-- Data for Name: cuisson; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.cuisson (cuisson_id, english_name, french_name) FROM stdin;
1	raw	cru
2	extra-rare	bleu
3	rare	saignant
4	medium	a point
5	well done	bien cuit
\.


--
-- Data for Name: currency_conversion; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.currency_conversion (date, conversion_rate) FROM stdin;
2025-05-29	1.1360
2025-06-01	1.1330
\.


--
-- Data for Name: dishes_cuisson; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.dishes_cuisson (dish_id, cuisson_id) FROM stdin;
12	1
12	2
12	3
12	4
12	5
13	1
13	2
13	3
13	4
13	5
14	1
14	2
14	3
14	4
14	5
15	1
15	2
15	3
15	4
15	5
16	1
16	2
16	3
16	4
16	5
\.


--
-- Data for Name: ingredients; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.ingredients (ingredient_id, name) FROM stdin;
1	cheese
2	charcuterie
3	honey
4	toasts
5	chicken
6	chili sauce
7	hummus
8	salad
9	cesar sauce
10	parmesan
11	croutons
12	tomato
13	scampi
14	feta
15	paprika
16	olive
17	cherry tomato
18	fig
19	walnut
20	salmon
21	rice
22	virgin sauce
23	garlic
24	beef
25	cheddar
26	burger sauce
27	gouda
28	bacon
29	egg
30	strawberry
31	pistachio cream
32	meringue
33	pinot blanc
34	pinot gris
35	rivaner
36	fries
37	citron
38	ginger
39	menthe
40	Coca Cola Zero
41	Coca Cola
42	Fanta orange
43	Sprite
44	Royal Bliss tonic water
45	Royal Bliss bitter lemon
46	Royal Bliss agrumes & ylang ylang
47	J├ñgermeister
48	 apple juice
49	 grenadine
50	 lemon juice
51	Vodka
52	 Passoa
53	 strawberry
54	 vanilla
55	 Prosecco
56	 Kalhua
57	 espresso
58	Prosecco
59	 ginger beer
60	 lime juice
61	Gin
62	Rhum Blanc
63	 sucre
64	Tequila
65	 grapefruit
66	Camomille
67	Verveine
68	Vert Menthe
69	Fruits Rouges
70	Vert Jasmin
71	Vert
72	 Citron
73	Ginger
74	Menthe
\.


--
-- Data for Name: dishes_ingredients; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.dishes_ingredients (dish_id, ingredient_id) FROM stdin;
1	1
2	2
3	3
3	4
3	10
4	5
4	6
5	7
6	5
6	8
6	9
6	10
6	11
6	12
7	5
7	8
7	9
7	10
7	11
7	12
8	20
8	21
8	22
8	8
9	13
9	21
9	23
9	8
12	24
12	25
12	26
12	12
12	8
12	36
13	24
13	25
13	26
13	12
13	8
13	36
14	24
14	27
14	28
14	29
14	26
14	12
14	8
14	36
15	24
15	27
15	28
15	29
15	26
15	12
15	8
15	36
16	24
16	36
16	8
17	30
17	31
17	32
\.


--
-- Data for Name: drink_sizes; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.drink_sizes (drink_id, size, price_eur, record_date) FROM stdin;
1	standard	6.50	2025-06-01
7	20cl	3.50	2025-06-01
8	20cl	3.50	2025-06-01
3	standard	11.50	2025-06-01
4	standard	13.50	2025-06-01
5	1l	7.50	2025-06-01
6	1l	7.50	2025-06-01
5	50cl	4.50	2025-06-01
5	1L	7.50	2025-06-01
6	50cl	4.50	2025-06-01
6	1L	7.50	2025-06-01
24	25cl	4.80	2025-06-01
24	50cl	8.60	2025-06-01
56		12.00	2025-06-01
9	20cl	3.50	2025-06-01
10	20cl	3.50	2025-06-01
11	20cl	3.50	2025-06-01
12	20cl	3.50	2025-06-01
13	20cl	3.60	2025-06-01
14	20cl	3.60	2025-06-01
15	20cl	3.60	2025-06-01
16	20cl	4.80	2025-06-01
17		0.80	2025-06-01
5	25cl	3.00	2025-06-01
6	25cl	3.00	2025-06-01
18	25cl	3.00	2025-06-01
19	33cl	4.50	2025-06-01
20	33cl	4.50	2025-06-01
21	20cl	3.50	2025-06-01
22	33cl	4.50	2025-06-01
23	30cl	6.80	2025-06-01
2	25cl	3.90	2025-06-01
25	25cl	4.60	2025-06-01
26	25cl	4.60	2025-06-01
27	25cl	5.20	2025-06-01
28	25cl	3.90	2025-06-01
29	25cl	3.90	2025-06-01
30	25cl	4.00	2025-06-01
31	25cl	4.00	2025-06-01
32	25cl	6.40	2025-06-01
2	50cl	7.20	2025-06-01
25	50cl	8.40	2025-06-01
26	50cl	8.40	2025-06-01
27	50cl	9.20	2025-06-01
28	50cl	6.80	2025-06-01
29	50cl	6.80	2025-06-01
30	50cl	7.50	2025-06-01
31	50cl	7.50	2025-06-01
32	50cl	9.90	2025-06-01
33	33cl	4.50	2025-06-01
34	33cl	4.50	2025-06-01
35	33cl	4.90	2025-06-01
36	33cl	5.20	2025-06-01
37	33cl	4.60	2025-06-01
38	33cl	4.90	2025-06-01
39	33cl	5.20	2025-06-01
40	33cl	5.80	2025-06-01
41	33cl	5.80	2025-06-01
42	33cl	6.20	2025-06-01
43	33cl	5.60	2025-06-01
44	33cl	5.60	2025-06-01
45	33cl	5.80	2025-06-01
46	33cl	5.80	2025-06-01
47	33cl	5.80	2025-06-01
48	33cl	5.60	2025-06-01
49	33cl	6.60	2025-06-01
50	33cl	6.80	2025-06-01
51	33cl	5.60	2025-06-01
52	33cl	6.80	2025-06-01
53	25cl	4.00	2025-06-01
54	50cl	7.40	2025-06-01
3		11.50	2025-06-01
112		7.00	2025-06-01
57		11.50	2025-06-01
58		11.50	2025-06-01
59		7.60	2025-06-01
60		7.80	2025-06-01
61		7.80	2025-06-01
62		7.50	2025-06-01
63		7.50	2025-06-01
64		7.50	2025-06-01
65		7.50	2025-06-01
66		9.50	2025-06-01
67		8.50	2025-06-01
68		12.00	2025-06-01
69		6.80	2025-06-01
70		11.00	2025-06-01
71		12.00	2025-06-01
72		5.00	2025-06-01
73		5.00	2025-06-01
74	2cl	3.50	2025-06-01
75	2cl	5.00	2025-06-01
76	6cl	7.50	2025-06-01
77	6cl	7.50	2025-06-01
78	6cl	7.50	2025-06-01
79	6cl	7.50	2025-06-01
80	6cl	6.50	2025-06-01
81	6cl	8.60	2025-06-01
82	6cl	7.00	2025-06-01
83	6cl	7.50	2025-06-01
84	6cl	9.50	2025-06-01
85	6cl	6.00	2025-06-01
86	6cl	8.50	2025-06-01
87	6cl	8.50	2025-06-01
88	6cl	6.50	2025-06-01
89	6cl	7.50	2025-06-01
90		9.00	2025-06-01
91		12.00	2025-06-01
4		13.50	2025-06-01
92		14.50	2025-06-01
93		15.00	2025-06-01
94		12.00	2025-06-01
95		14.00	2025-06-01
96		14.00	2025-06-01
97		14.00	2025-06-01
98		10.50	2025-06-01
99		11.50	2025-06-01
100		11.50	2025-06-01
101		12.50	2025-06-01
102		12.50	2025-06-01
103		12.50	2025-06-01
104		12.50	2025-06-01
105		12.50	2025-06-01
106		10.00	2025-06-01
107		11.00	2025-06-01
108		11.00	2025-06-01
109		10.00	2025-06-01
110		10.00	2025-06-01
111		10.00	2025-06-01
55		11.50	2025-06-01
113		7.50	2025-06-01
114		7.50	2025-06-01
115		8.50	2025-06-01
116	5cl	11.50	2025-06-01
117	5cl	13.50	2025-06-01
118	5cl	16.50	2025-06-01
120	5cl	7.00	2025-06-01
121	5cl	8.50	2025-06-01
122	5cl	10.50	2025-06-01
119	5cl	8.50	2025-06-01
123	5cl	12.50	2025-06-01
124	5cl	7.00	2025-06-01
125	5cl	7.00	2025-06-01
126	5cl	5.00	2025-06-01
127		3.50	2025-06-01
128		3.50	2025-06-01
129		3.60	2025-06-01
130		3.60	2025-06-01
131		4.50	2025-06-01
132		3.60	2025-06-01
133		4.10	2025-06-01
134		4.90	2025-06-01
135		4.50	2025-06-01
136		4.80	2025-06-01
137		3.50	2025-06-01
138		7.00	2025-06-01
139		0.50	2025-06-01
140		3.90	2025-06-01
141		3.50	2025-06-01
142		3.50	2025-06-01
143		3.50	2025-06-01
144		3.50	2025-06-01
145	15cl	7.20	2025-06-01
145	25cl	11.20	2025-06-01
145	50cl	21.60	2025-06-01
145	bottle	26.00	2025-06-01
146	bottle	29.00	2025-06-01
147	bottle	45.00	2025-06-01
148	bottle	29.00	2025-06-01
149	bottle	32.00	2025-06-01
150	15cl	4.50	2025-06-01
150	25cl	6.00	2025-06-01
150	50cl	11.60	2025-06-01
151	15cl	6.50	2025-06-01
151	25cl	10.00	2025-06-01
151	50cl	18.50	2025-06-01
152	15cl	4.60	2025-06-01
152	25cl	7.20	2025-06-01
152	50cl	13.80	2025-06-01
153	15cl	6.00	2025-06-01
153	25cl	11.00	2025-06-01
153	50cl	24.00	2025-06-01
154	15cl	8.00	2025-06-01
154	25cl	14.00	2025-06-01
154	50cl	25.00	2025-06-01
154	bottle	39.00	2025-06-01
155	bottle	43.00	2025-06-01
153	bottle	27.00	2025-06-01
156	bottle	45.00	2025-06-01
157	15cl	8.00	2025-06-01
157	25cl	14.00	2025-06-01
157	50cl	25.00	2025-06-01
157	bottle	27.00	2025-06-01
158	bottle	34.00	2025-06-01
159	bottle	49.00	2025-06-01
160		25.00	2025-06-01
161	glass	9.50	2025-06-01
161	bottle	29.00	2025-06-01
162	glass	8.00	2025-06-01
162	bottle	24.00	2025-06-01
163	glass	12.00	2025-06-01
163	bottle	45.00	2025-06-01
\.


--
-- Data for Name: drinks_ingredients; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.drinks_ingredients (drink_id, ingredient_id) FROM stdin;
95	47
95	48
95	49
95	50
96	51
96	52
96	53
96	54
96	50
96	55
97	51
97	56
97	57
98	58
98	53
99	51
99	59
99	60
100	61
100	59
100	50
101	62
101	60
101	63
107	64
107	60
107	65
141	66
141	67
141	68
141	69
141	70
141	71
140	72
140	73
140	74
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.orders (order_id, recipient, amount_hbd, memo, hive_uri) FROM stdin;
1	indies.cafe	20.394	Planche de fromage TABLE 1	\N
2	indies.cafe	20.394	Planche de fromage TABLE 10	\N
3	indies.cafe	20.394	Planche de fromage TABLE 11	\N
4	indies.cafe	20.394	Planche de fromage TABLE 12	\N
5	indies.cafe	20.394	Planche de fromage TABLE 13	\N
6	indies.cafe	20.394	Planche de fromage TABLE 14	\N
7	indies.cafe	20.394	Planche de fromage TABLE 141	\N
8	indies.cafe	20.394	Planche de fromage TABLE 142	\N
9	indies.cafe	20.394	Planche de fromage TABLE 15	\N
10	indies.cafe	20.394	Planche de fromage TABLE 16	\N
11	indies.cafe	20.394	Planche de fromage TABLE 17	\N
12	indies.cafe	20.394	Planche de fromage TABLE 18	\N
13	indies.cafe	20.394	Planche de fromage TABLE 19	\N
14	indies.cafe	20.394	Planche de fromage TABLE 2	\N
15	indies.cafe	20.394	Planche de fromage TABLE 20	\N
16	indies.cafe	20.394	Planche de fromage TABLE 201	\N
17	indies.cafe	20.394	Planche de fromage TABLE 202	\N
18	indies.cafe	20.394	Planche de fromage TABLE 203	\N
19	indies.cafe	20.394	Planche de fromage TABLE 204	\N
20	indies.cafe	20.394	Planche de fromage TABLE 205	\N
21	indies.cafe	20.394	Planche de fromage TABLE 206	\N
22	indies.cafe	20.394	Planche de fromage TABLE 207	\N
23	indies.cafe	20.394	Planche de fromage TABLE 208	\N
24	indies.cafe	20.394	Planche de fromage TABLE 209	\N
25	indies.cafe	20.394	Planche de fromage TABLE 21	\N
26	indies.cafe	20.394	Planche de fromage TABLE 210	\N
27	indies.cafe	20.394	Planche de fromage TABLE 211	\N
28	indies.cafe	20.394	Planche de fromage TABLE 212	\N
29	indies.cafe	20.394	Planche de fromage TABLE 213	\N
30	indies.cafe	20.394	Planche de fromage TABLE 214	\N
31	indies.cafe	20.394	Planche de fromage TABLE 215	\N
32	indies.cafe	20.394	Planche de fromage TABLE 216	\N
33	indies.cafe	20.394	Planche de fromage TABLE 217	\N
34	indies.cafe	20.394	Planche de fromage TABLE 218	\N
35	indies.cafe	20.394	Planche de fromage TABLE 22	\N
36	indies.cafe	20.394	Planche de fromage TABLE 23	\N
37	indies.cafe	20.394	Planche de fromage TABLE 24	\N
38	indies.cafe	20.394	Planche de fromage TABLE 25	\N
39	indies.cafe	20.394	Planche de fromage TABLE 26	\N
40	indies.cafe	20.394	Planche de fromage TABLE 27	\N
41	indies.cafe	20.394	Planche de fromage TABLE 3	\N
42	indies.cafe	20.394	Planche de fromage TABLE 301	\N
43	indies.cafe	20.394	Planche de fromage TABLE 302	\N
44	indies.cafe	20.394	Planche de fromage TABLE 303	\N
45	indies.cafe	20.394	Planche de fromage TABLE 304	\N
46	indies.cafe	20.394	Planche de fromage TABLE 305	\N
47	indies.cafe	20.394	Planche de fromage TABLE 306	\N
48	indies.cafe	20.394	Planche de fromage TABLE 307	\N
49	indies.cafe	20.394	Planche de fromage TABLE 308	\N
50	indies.cafe	20.394	Planche de fromage TABLE 309	\N
51	indies.cafe	20.394	Planche de fromage TABLE 310	\N
52	indies.cafe	20.394	Planche de fromage TABLE 311	\N
53	indies.cafe	20.394	Planche de fromage TABLE 312	\N
54	indies.cafe	20.394	Planche de fromage TABLE 313	\N
55	indies.cafe	20.394	Planche de fromage TABLE 314	\N
56	indies.cafe	20.394	Planche de fromage TABLE 315	\N
57	indies.cafe	20.394	Planche de fromage TABLE 316	\N
58	indies.cafe	20.394	Planche de fromage TABLE 317	\N
59	indies.cafe	20.394	Planche de fromage TABLE 318	\N
60	indies.cafe	20.394	Planche de fromage TABLE 319	\N
61	indies.cafe	20.394	Planche de fromage TABLE 320	\N
62	indies.cafe	20.394	Planche de fromage TABLE 321	\N
63	indies.cafe	20.394	Planche de fromage TABLE 322	\N
64	indies.cafe	20.394	Planche de fromage TABLE 323	\N
65	indies.cafe	20.394	Planche de fromage TABLE 4	\N
66	indies.cafe	20.394	Planche de fromage TABLE 5	\N
67	indies.cafe	20.394	Planche de fromage TABLE 6	\N
68	indies.cafe	20.394	Planche de fromage TABLE 7	\N
69	indies.cafe	20.394	Planche de fromage TABLE 8	\N
70	indies.cafe	20.394	Planche de fromage TABLE 9	\N
71	indies.cafe	22.094	Planche de charcuterie TABLE 1	\N
72	indies.cafe	22.094	Planche de charcuterie TABLE 10	\N
73	indies.cafe	22.094	Planche de charcuterie TABLE 11	\N
74	indies.cafe	22.094	Planche de charcuterie TABLE 12	\N
75	indies.cafe	22.094	Planche de charcuterie TABLE 13	\N
76	indies.cafe	22.094	Planche de charcuterie TABLE 14	\N
77	indies.cafe	22.094	Planche de charcuterie TABLE 141	\N
78	indies.cafe	22.094	Planche de charcuterie TABLE 142	\N
79	indies.cafe	22.094	Planche de charcuterie TABLE 15	\N
80	indies.cafe	22.094	Planche de charcuterie TABLE 16	\N
81	indies.cafe	22.094	Planche de charcuterie TABLE 17	\N
82	indies.cafe	22.094	Planche de charcuterie TABLE 18	\N
83	indies.cafe	22.094	Planche de charcuterie TABLE 19	\N
84	indies.cafe	22.094	Planche de charcuterie TABLE 2	\N
85	indies.cafe	22.094	Planche de charcuterie TABLE 20	\N
86	indies.cafe	22.094	Planche de charcuterie TABLE 201	\N
87	indies.cafe	22.094	Planche de charcuterie TABLE 202	\N
88	indies.cafe	22.094	Planche de charcuterie TABLE 203	\N
89	indies.cafe	22.094	Planche de charcuterie TABLE 204	\N
90	indies.cafe	22.094	Planche de charcuterie TABLE 205	\N
91	indies.cafe	22.094	Planche de charcuterie TABLE 206	\N
92	indies.cafe	22.094	Planche de charcuterie TABLE 207	\N
93	indies.cafe	22.094	Planche de charcuterie TABLE 208	\N
94	indies.cafe	22.094	Planche de charcuterie TABLE 209	\N
95	indies.cafe	22.094	Planche de charcuterie TABLE 21	\N
96	indies.cafe	22.094	Planche de charcuterie TABLE 210	\N
97	indies.cafe	22.094	Planche de charcuterie TABLE 211	\N
98	indies.cafe	22.094	Planche de charcuterie TABLE 212	\N
99	indies.cafe	22.094	Planche de charcuterie TABLE 213	\N
100	indies.cafe	22.094	Planche de charcuterie TABLE 214	\N
101	indies.cafe	22.094	Planche de charcuterie TABLE 215	\N
102	indies.cafe	22.094	Planche de charcuterie TABLE 216	\N
103	indies.cafe	22.094	Planche de charcuterie TABLE 217	\N
104	indies.cafe	22.094	Planche de charcuterie TABLE 218	\N
105	indies.cafe	22.094	Planche de charcuterie TABLE 22	\N
106	indies.cafe	22.094	Planche de charcuterie TABLE 23	\N
107	indies.cafe	22.094	Planche de charcuterie TABLE 24	\N
108	indies.cafe	22.094	Planche de charcuterie TABLE 25	\N
109	indies.cafe	22.094	Planche de charcuterie TABLE 26	\N
110	indies.cafe	22.094	Planche de charcuterie TABLE 27	\N
111	indies.cafe	22.094	Planche de charcuterie TABLE 3	\N
112	indies.cafe	22.094	Planche de charcuterie TABLE 301	\N
113	indies.cafe	22.094	Planche de charcuterie TABLE 302	\N
114	indies.cafe	22.094	Planche de charcuterie TABLE 303	\N
115	indies.cafe	22.094	Planche de charcuterie TABLE 304	\N
116	indies.cafe	22.094	Planche de charcuterie TABLE 305	\N
117	indies.cafe	22.094	Planche de charcuterie TABLE 306	\N
118	indies.cafe	22.094	Planche de charcuterie TABLE 307	\N
119	indies.cafe	22.094	Planche de charcuterie TABLE 308	\N
120	indies.cafe	22.094	Planche de charcuterie TABLE 309	\N
121	indies.cafe	22.094	Planche de charcuterie TABLE 310	\N
122	indies.cafe	22.094	Planche de charcuterie TABLE 311	\N
123	indies.cafe	22.094	Planche de charcuterie TABLE 312	\N
124	indies.cafe	22.094	Planche de charcuterie TABLE 313	\N
125	indies.cafe	22.094	Planche de charcuterie TABLE 314	\N
126	indies.cafe	22.094	Planche de charcuterie TABLE 315	\N
127	indies.cafe	22.094	Planche de charcuterie TABLE 316	\N
128	indies.cafe	22.094	Planche de charcuterie TABLE 317	\N
129	indies.cafe	22.094	Planche de charcuterie TABLE 318	\N
130	indies.cafe	22.094	Planche de charcuterie TABLE 319	\N
131	indies.cafe	22.094	Planche de charcuterie TABLE 320	\N
132	indies.cafe	22.094	Planche de charcuterie TABLE 321	\N
133	indies.cafe	22.094	Planche de charcuterie TABLE 322	\N
134	indies.cafe	22.094	Planche de charcuterie TABLE 323	\N
135	indies.cafe	22.094	Planche de charcuterie TABLE 4	\N
136	indies.cafe	22.094	Planche de charcuterie TABLE 5	\N
137	indies.cafe	22.094	Planche de charcuterie TABLE 6	\N
138	indies.cafe	22.094	Planche de charcuterie TABLE 7	\N
139	indies.cafe	22.094	Planche de charcuterie TABLE 8	\N
140	indies.cafe	22.094	Planche de charcuterie TABLE 9	\N
141	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 1	\N
142	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 10	\N
143	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 11	\N
144	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 12	\N
145	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 13	\N
146	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 14	\N
147	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 141	\N
148	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 142	\N
149	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 15	\N
150	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 16	\N
151	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 17	\N
152	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 18	\N
153	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 19	\N
154	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 2	\N
155	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 20	\N
156	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 201	\N
157	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 202	\N
158	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 203	\N
159	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 204	\N
160	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 205	\N
161	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 206	\N
162	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 207	\N
163	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 208	\N
164	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 209	\N
165	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 21	\N
166	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 210	\N
167	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 211	\N
168	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 212	\N
169	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 213	\N
170	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 214	\N
171	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 215	\N
172	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 216	\N
173	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 217	\N
174	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 218	\N
175	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 22	\N
176	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 23	\N
177	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 24	\N
178	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 25	\N
179	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 26	\N
180	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 27	\N
181	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 3	\N
182	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 301	\N
183	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 302	\N
184	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 303	\N
185	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 304	\N
186	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 305	\N
187	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 306	\N
188	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 307	\N
189	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 308	\N
190	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 309	\N
191	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 310	\N
192	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 311	\N
193	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 312	\N
194	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 313	\N
195	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 314	\N
196	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 315	\N
197	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 316	\N
198	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 317	\N
199	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 318	\N
200	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 319	\N
201	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 320	\N
202	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 321	\N
203	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 322	\N
204	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 323	\N
205	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 4	\N
206	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 5	\N
207	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 6	\N
208	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 7	\N
209	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 8	\N
210	indies.cafe	17.562	Camembert roti au miel, toasts TABLE 9	\N
211	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 1	\N
212	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 10	\N
213	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 11	\N
214	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 12	\N
215	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 13	\N
216	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 14	\N
217	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 141	\N
218	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 142	\N
219	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 15	\N
220	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 16	\N
221	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 17	\N
222	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 18	\N
223	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 19	\N
224	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 2	\N
225	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 20	\N
226	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 201	\N
227	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 202	\N
228	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 203	\N
229	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 204	\N
230	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 205	\N
231	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 206	\N
232	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 207	\N
233	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 208	\N
234	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 209	\N
235	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 21	\N
236	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 210	\N
237	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 211	\N
238	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 212	\N
239	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 213	\N
240	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 214	\N
241	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 215	\N
242	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 216	\N
243	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 217	\N
244	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 218	\N
245	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 22	\N
246	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 23	\N
247	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 24	\N
248	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 25	\N
249	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 26	\N
250	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 27	\N
251	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 3	\N
252	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 301	\N
253	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 302	\N
254	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 303	\N
255	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 304	\N
256	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 305	\N
257	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 306	\N
258	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 307	\N
259	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 308	\N
260	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 309	\N
261	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 310	\N
262	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 311	\N
263	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 312	\N
264	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 313	\N
265	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 314	\N
266	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 315	\N
267	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 316	\N
268	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 317	\N
269	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 318	\N
270	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 319	\N
271	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 320	\N
272	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 321	\N
273	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 322	\N
274	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 323	\N
275	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 4	\N
276	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 5	\N
277	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 6	\N
278	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 7	\N
279	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 8	\N
280	indies.cafe	10.197	Chili Chicken Wings "Good Bye My Lips" (4pc) TABLE 9	\N
281	indies.cafe	7.365	Houmous TABLE 1	\N
282	indies.cafe	7.365	Houmous TABLE 10	\N
283	indies.cafe	7.365	Houmous TABLE 11	\N
284	indies.cafe	7.365	Houmous TABLE 12	\N
285	indies.cafe	7.365	Houmous TABLE 13	\N
286	indies.cafe	7.365	Houmous TABLE 14	\N
287	indies.cafe	7.365	Houmous TABLE 141	\N
288	indies.cafe	7.365	Houmous TABLE 142	\N
289	indies.cafe	7.365	Houmous TABLE 15	\N
290	indies.cafe	7.365	Houmous TABLE 16	\N
291	indies.cafe	7.365	Houmous TABLE 17	\N
292	indies.cafe	7.365	Houmous TABLE 18	\N
293	indies.cafe	7.365	Houmous TABLE 19	\N
294	indies.cafe	7.365	Houmous TABLE 2	\N
295	indies.cafe	7.365	Houmous TABLE 20	\N
296	indies.cafe	7.365	Houmous TABLE 201	\N
297	indies.cafe	7.365	Houmous TABLE 202	\N
298	indies.cafe	7.365	Houmous TABLE 203	\N
299	indies.cafe	7.365	Houmous TABLE 204	\N
300	indies.cafe	7.365	Houmous TABLE 205	\N
301	indies.cafe	7.365	Houmous TABLE 206	\N
302	indies.cafe	7.365	Houmous TABLE 207	\N
303	indies.cafe	7.365	Houmous TABLE 208	\N
304	indies.cafe	7.365	Houmous TABLE 209	\N
305	indies.cafe	7.365	Houmous TABLE 21	\N
306	indies.cafe	7.365	Houmous TABLE 210	\N
307	indies.cafe	7.365	Houmous TABLE 211	\N
308	indies.cafe	7.365	Houmous TABLE 212	\N
309	indies.cafe	7.365	Houmous TABLE 213	\N
310	indies.cafe	7.365	Houmous TABLE 214	\N
311	indies.cafe	7.365	Houmous TABLE 215	\N
312	indies.cafe	7.365	Houmous TABLE 216	\N
313	indies.cafe	7.365	Houmous TABLE 217	\N
314	indies.cafe	7.365	Houmous TABLE 218	\N
315	indies.cafe	7.365	Houmous TABLE 22	\N
316	indies.cafe	7.365	Houmous TABLE 23	\N
317	indies.cafe	7.365	Houmous TABLE 24	\N
318	indies.cafe	7.365	Houmous TABLE 25	\N
319	indies.cafe	7.365	Houmous TABLE 26	\N
320	indies.cafe	7.365	Houmous TABLE 27	\N
321	indies.cafe	7.365	Houmous TABLE 3	\N
322	indies.cafe	7.365	Houmous TABLE 301	\N
323	indies.cafe	7.365	Houmous TABLE 302	\N
324	indies.cafe	7.365	Houmous TABLE 303	\N
325	indies.cafe	7.365	Houmous TABLE 304	\N
326	indies.cafe	7.365	Houmous TABLE 305	\N
327	indies.cafe	7.365	Houmous TABLE 306	\N
328	indies.cafe	7.365	Houmous TABLE 307	\N
329	indies.cafe	7.365	Houmous TABLE 308	\N
330	indies.cafe	7.365	Houmous TABLE 309	\N
331	indies.cafe	7.365	Houmous TABLE 310	\N
332	indies.cafe	7.365	Houmous TABLE 311	\N
333	indies.cafe	7.365	Houmous TABLE 312	\N
334	indies.cafe	7.365	Houmous TABLE 313	\N
335	indies.cafe	7.365	Houmous TABLE 314	\N
336	indies.cafe	7.365	Houmous TABLE 315	\N
337	indies.cafe	7.365	Houmous TABLE 316	\N
338	indies.cafe	7.365	Houmous TABLE 317	\N
339	indies.cafe	7.365	Houmous TABLE 318	\N
340	indies.cafe	7.365	Houmous TABLE 319	\N
341	indies.cafe	7.365	Houmous TABLE 320	\N
342	indies.cafe	7.365	Houmous TABLE 321	\N
343	indies.cafe	7.365	Houmous TABLE 322	\N
344	indies.cafe	7.365	Houmous TABLE 323	\N
345	indies.cafe	7.365	Houmous TABLE 4	\N
346	indies.cafe	7.365	Houmous TABLE 5	\N
347	indies.cafe	7.365	Houmous TABLE 6	\N
348	indies.cafe	7.365	Houmous TABLE 7	\N
349	indies.cafe	7.365	Houmous TABLE 8	\N
350	indies.cafe	7.365	Houmous TABLE 9	\N
351	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 1	\N
352	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 10	\N
353	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 11	\N
354	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 12	\N
355	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 13	\N
356	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 14	\N
357	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 141	\N
358	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 142	\N
359	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 15	\N
360	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 16	\N
361	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 17	\N
362	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 18	\N
363	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 19	\N
364	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 2	\N
365	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 20	\N
366	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 201	\N
367	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 202	\N
368	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 203	\N
369	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 204	\N
370	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 205	\N
371	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 206	\N
372	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 207	\N
373	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 208	\N
374	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 209	\N
375	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 21	\N
376	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 210	\N
377	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 211	\N
378	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 212	\N
379	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 213	\N
380	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 214	\N
381	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 215	\N
382	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 216	\N
383	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 217	\N
384	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 218	\N
385	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 22	\N
386	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 23	\N
387	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 24	\N
388	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 25	\N
389	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 26	\N
390	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 27	\N
391	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 3	\N
392	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 301	\N
393	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 302	\N
394	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 303	\N
395	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 304	\N
396	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 305	\N
397	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 306	\N
398	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 307	\N
399	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 308	\N
400	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 309	\N
401	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 310	\N
402	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 311	\N
403	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 312	\N
404	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 313	\N
405	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 314	\N
406	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 315	\N
407	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 316	\N
408	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 317	\N
409	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 318	\N
410	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 319	\N
411	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 320	\N
412	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 321	\N
413	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 322	\N
414	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 323	\N
415	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 4	\N
416	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 5	\N
417	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 6	\N
418	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 7	\N
419	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 8	\N
420	indies.cafe	13.596	Salade Cesar Poulet (small) TABLE 9	\N
421	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 1	\N
422	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 10	\N
423	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 11	\N
424	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 12	\N
425	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 13	\N
426	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 14	\N
427	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 141	\N
428	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 142	\N
429	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 15	\N
430	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 16	\N
431	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 17	\N
432	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 18	\N
433	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 19	\N
434	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 2	\N
435	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 20	\N
436	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 201	\N
437	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 202	\N
438	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 203	\N
439	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 204	\N
440	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 205	\N
441	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 206	\N
442	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 207	\N
443	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 208	\N
444	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 209	\N
445	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 21	\N
446	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 210	\N
447	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 211	\N
448	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 212	\N
449	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 213	\N
450	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 214	\N
451	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 215	\N
452	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 216	\N
453	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 217	\N
454	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 218	\N
455	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 22	\N
456	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 23	\N
457	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 24	\N
458	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 25	\N
459	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 26	\N
460	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 27	\N
461	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 3	\N
462	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 301	\N
463	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 302	\N
464	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 303	\N
465	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 304	\N
466	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 305	\N
467	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 306	\N
468	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 307	\N
469	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 308	\N
470	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 309	\N
471	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 310	\N
472	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 311	\N
473	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 312	\N
474	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 313	\N
475	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 314	\N
476	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 315	\N
477	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 316	\N
478	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 317	\N
479	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 318	\N
480	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 319	\N
481	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 320	\N
482	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 321	\N
483	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 322	\N
484	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 323	\N
485	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 4	\N
486	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 5	\N
487	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 6	\N
488	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 7	\N
489	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 8	\N
490	indies.cafe	20.394	Salade Cesar Poulet (large) TABLE 9	\N
491	indies.cafe	26.059	Filet de saumon frais grille TABLE 1	\N
492	indies.cafe	26.059	Filet de saumon frais grille TABLE 10	\N
493	indies.cafe	26.059	Filet de saumon frais grille TABLE 11	\N
494	indies.cafe	26.059	Filet de saumon frais grille TABLE 12	\N
495	indies.cafe	26.059	Filet de saumon frais grille TABLE 13	\N
496	indies.cafe	26.059	Filet de saumon frais grille TABLE 14	\N
497	indies.cafe	26.059	Filet de saumon frais grille TABLE 141	\N
498	indies.cafe	26.059	Filet de saumon frais grille TABLE 142	\N
499	indies.cafe	26.059	Filet de saumon frais grille TABLE 15	\N
500	indies.cafe	26.059	Filet de saumon frais grille TABLE 16	\N
501	indies.cafe	26.059	Filet de saumon frais grille TABLE 17	\N
502	indies.cafe	26.059	Filet de saumon frais grille TABLE 18	\N
503	indies.cafe	26.059	Filet de saumon frais grille TABLE 19	\N
504	indies.cafe	26.059	Filet de saumon frais grille TABLE 2	\N
505	indies.cafe	26.059	Filet de saumon frais grille TABLE 20	\N
506	indies.cafe	26.059	Filet de saumon frais grille TABLE 201	\N
507	indies.cafe	26.059	Filet de saumon frais grille TABLE 202	\N
508	indies.cafe	26.059	Filet de saumon frais grille TABLE 203	\N
509	indies.cafe	26.059	Filet de saumon frais grille TABLE 204	\N
510	indies.cafe	26.059	Filet de saumon frais grille TABLE 205	\N
511	indies.cafe	26.059	Filet de saumon frais grille TABLE 206	\N
512	indies.cafe	26.059	Filet de saumon frais grille TABLE 207	\N
513	indies.cafe	26.059	Filet de saumon frais grille TABLE 208	\N
514	indies.cafe	26.059	Filet de saumon frais grille TABLE 209	\N
515	indies.cafe	26.059	Filet de saumon frais grille TABLE 21	\N
516	indies.cafe	26.059	Filet de saumon frais grille TABLE 210	\N
517	indies.cafe	26.059	Filet de saumon frais grille TABLE 211	\N
518	indies.cafe	26.059	Filet de saumon frais grille TABLE 212	\N
519	indies.cafe	26.059	Filet de saumon frais grille TABLE 213	\N
520	indies.cafe	26.059	Filet de saumon frais grille TABLE 214	\N
521	indies.cafe	26.059	Filet de saumon frais grille TABLE 215	\N
522	indies.cafe	26.059	Filet de saumon frais grille TABLE 216	\N
523	indies.cafe	26.059	Filet de saumon frais grille TABLE 217	\N
524	indies.cafe	26.059	Filet de saumon frais grille TABLE 218	\N
525	indies.cafe	26.059	Filet de saumon frais grille TABLE 22	\N
526	indies.cafe	26.059	Filet de saumon frais grille TABLE 23	\N
527	indies.cafe	26.059	Filet de saumon frais grille TABLE 24	\N
528	indies.cafe	26.059	Filet de saumon frais grille TABLE 25	\N
529	indies.cafe	26.059	Filet de saumon frais grille TABLE 26	\N
530	indies.cafe	26.059	Filet de saumon frais grille TABLE 27	\N
531	indies.cafe	26.059	Filet de saumon frais grille TABLE 3	\N
532	indies.cafe	26.059	Filet de saumon frais grille TABLE 301	\N
533	indies.cafe	26.059	Filet de saumon frais grille TABLE 302	\N
534	indies.cafe	26.059	Filet de saumon frais grille TABLE 303	\N
535	indies.cafe	26.059	Filet de saumon frais grille TABLE 304	\N
536	indies.cafe	26.059	Filet de saumon frais grille TABLE 305	\N
537	indies.cafe	26.059	Filet de saumon frais grille TABLE 306	\N
538	indies.cafe	26.059	Filet de saumon frais grille TABLE 307	\N
539	indies.cafe	26.059	Filet de saumon frais grille TABLE 308	\N
540	indies.cafe	26.059	Filet de saumon frais grille TABLE 309	\N
541	indies.cafe	26.059	Filet de saumon frais grille TABLE 310	\N
542	indies.cafe	26.059	Filet de saumon frais grille TABLE 311	\N
543	indies.cafe	26.059	Filet de saumon frais grille TABLE 312	\N
544	indies.cafe	26.059	Filet de saumon frais grille TABLE 313	\N
545	indies.cafe	26.059	Filet de saumon frais grille TABLE 314	\N
546	indies.cafe	26.059	Filet de saumon frais grille TABLE 315	\N
547	indies.cafe	26.059	Filet de saumon frais grille TABLE 316	\N
548	indies.cafe	26.059	Filet de saumon frais grille TABLE 317	\N
549	indies.cafe	26.059	Filet de saumon frais grille TABLE 318	\N
550	indies.cafe	26.059	Filet de saumon frais grille TABLE 319	\N
551	indies.cafe	26.059	Filet de saumon frais grille TABLE 320	\N
552	indies.cafe	26.059	Filet de saumon frais grille TABLE 321	\N
553	indies.cafe	26.059	Filet de saumon frais grille TABLE 322	\N
554	indies.cafe	26.059	Filet de saumon frais grille TABLE 323	\N
555	indies.cafe	26.059	Filet de saumon frais grille TABLE 4	\N
556	indies.cafe	26.059	Filet de saumon frais grille TABLE 5	\N
557	indies.cafe	26.059	Filet de saumon frais grille TABLE 6	\N
558	indies.cafe	26.059	Filet de saumon frais grille TABLE 7	\N
559	indies.cafe	26.059	Filet de saumon frais grille TABLE 8	\N
560	indies.cafe	26.059	Filet de saumon frais grille TABLE 9	\N
561	indies.cafe	24.926	Scampis grilles a l'ail TABLE 1	\N
562	indies.cafe	24.926	Scampis grilles a l'ail TABLE 10	\N
563	indies.cafe	24.926	Scampis grilles a l'ail TABLE 11	\N
564	indies.cafe	24.926	Scampis grilles a l'ail TABLE 12	\N
565	indies.cafe	24.926	Scampis grilles a l'ail TABLE 13	\N
566	indies.cafe	24.926	Scampis grilles a l'ail TABLE 14	\N
567	indies.cafe	24.926	Scampis grilles a l'ail TABLE 141	\N
568	indies.cafe	24.926	Scampis grilles a l'ail TABLE 142	\N
569	indies.cafe	24.926	Scampis grilles a l'ail TABLE 15	\N
570	indies.cafe	24.926	Scampis grilles a l'ail TABLE 16	\N
571	indies.cafe	24.926	Scampis grilles a l'ail TABLE 17	\N
572	indies.cafe	24.926	Scampis grilles a l'ail TABLE 18	\N
573	indies.cafe	24.926	Scampis grilles a l'ail TABLE 19	\N
574	indies.cafe	24.926	Scampis grilles a l'ail TABLE 2	\N
575	indies.cafe	24.926	Scampis grilles a l'ail TABLE 20	\N
576	indies.cafe	24.926	Scampis grilles a l'ail TABLE 201	\N
577	indies.cafe	24.926	Scampis grilles a l'ail TABLE 202	\N
578	indies.cafe	24.926	Scampis grilles a l'ail TABLE 203	\N
579	indies.cafe	24.926	Scampis grilles a l'ail TABLE 204	\N
580	indies.cafe	24.926	Scampis grilles a l'ail TABLE 205	\N
581	indies.cafe	24.926	Scampis grilles a l'ail TABLE 206	\N
582	indies.cafe	24.926	Scampis grilles a l'ail TABLE 207	\N
583	indies.cafe	24.926	Scampis grilles a l'ail TABLE 208	\N
584	indies.cafe	24.926	Scampis grilles a l'ail TABLE 209	\N
585	indies.cafe	24.926	Scampis grilles a l'ail TABLE 21	\N
586	indies.cafe	24.926	Scampis grilles a l'ail TABLE 210	\N
587	indies.cafe	24.926	Scampis grilles a l'ail TABLE 211	\N
588	indies.cafe	24.926	Scampis grilles a l'ail TABLE 212	\N
589	indies.cafe	24.926	Scampis grilles a l'ail TABLE 213	\N
590	indies.cafe	24.926	Scampis grilles a l'ail TABLE 214	\N
591	indies.cafe	24.926	Scampis grilles a l'ail TABLE 215	\N
592	indies.cafe	24.926	Scampis grilles a l'ail TABLE 216	\N
593	indies.cafe	24.926	Scampis grilles a l'ail TABLE 217	\N
594	indies.cafe	24.926	Scampis grilles a l'ail TABLE 218	\N
595	indies.cafe	24.926	Scampis grilles a l'ail TABLE 22	\N
596	indies.cafe	24.926	Scampis grilles a l'ail TABLE 23	\N
597	indies.cafe	24.926	Scampis grilles a l'ail TABLE 24	\N
598	indies.cafe	24.926	Scampis grilles a l'ail TABLE 25	\N
599	indies.cafe	24.926	Scampis grilles a l'ail TABLE 26	\N
600	indies.cafe	24.926	Scampis grilles a l'ail TABLE 27	\N
601	indies.cafe	24.926	Scampis grilles a l'ail TABLE 3	\N
602	indies.cafe	24.926	Scampis grilles a l'ail TABLE 301	\N
603	indies.cafe	24.926	Scampis grilles a l'ail TABLE 302	\N
604	indies.cafe	24.926	Scampis grilles a l'ail TABLE 303	\N
605	indies.cafe	24.926	Scampis grilles a l'ail TABLE 304	\N
606	indies.cafe	24.926	Scampis grilles a l'ail TABLE 305	\N
607	indies.cafe	24.926	Scampis grilles a l'ail TABLE 306	\N
608	indies.cafe	24.926	Scampis grilles a l'ail TABLE 307	\N
609	indies.cafe	24.926	Scampis grilles a l'ail TABLE 308	\N
610	indies.cafe	24.926	Scampis grilles a l'ail TABLE 309	\N
611	indies.cafe	24.926	Scampis grilles a l'ail TABLE 310	\N
612	indies.cafe	24.926	Scampis grilles a l'ail TABLE 311	\N
613	indies.cafe	24.926	Scampis grilles a l'ail TABLE 312	\N
614	indies.cafe	24.926	Scampis grilles a l'ail TABLE 313	\N
615	indies.cafe	24.926	Scampis grilles a l'ail TABLE 314	\N
616	indies.cafe	24.926	Scampis grilles a l'ail TABLE 315	\N
617	indies.cafe	24.926	Scampis grilles a l'ail TABLE 316	\N
618	indies.cafe	24.926	Scampis grilles a l'ail TABLE 317	\N
619	indies.cafe	24.926	Scampis grilles a l'ail TABLE 318	\N
620	indies.cafe	24.926	Scampis grilles a l'ail TABLE 319	\N
621	indies.cafe	24.926	Scampis grilles a l'ail TABLE 320	\N
622	indies.cafe	24.926	Scampis grilles a l'ail TABLE 321	\N
623	indies.cafe	24.926	Scampis grilles a l'ail TABLE 322	\N
624	indies.cafe	24.926	Scampis grilles a l'ail TABLE 323	\N
625	indies.cafe	24.926	Scampis grilles a l'ail TABLE 4	\N
626	indies.cafe	24.926	Scampis grilles a l'ail TABLE 5	\N
627	indies.cafe	24.926	Scampis grilles a l'ail TABLE 6	\N
628	indies.cafe	24.926	Scampis grilles a l'ail TABLE 7	\N
629	indies.cafe	24.926	Scampis grilles a l'ail TABLE 8	\N
630	indies.cafe	24.926	Scampis grilles a l'ail TABLE 9	\N
631	indies.cafe	13.596	Soupe du Moment (small) TABLE 1	\N
632	indies.cafe	13.596	Soupe du Moment (small) TABLE 10	\N
633	indies.cafe	13.596	Soupe du Moment (small) TABLE 11	\N
634	indies.cafe	13.596	Soupe du Moment (small) TABLE 12	\N
635	indies.cafe	13.596	Soupe du Moment (small) TABLE 13	\N
636	indies.cafe	13.596	Soupe du Moment (small) TABLE 14	\N
637	indies.cafe	13.596	Soupe du Moment (small) TABLE 141	\N
638	indies.cafe	13.596	Soupe du Moment (small) TABLE 142	\N
639	indies.cafe	13.596	Soupe du Moment (small) TABLE 15	\N
640	indies.cafe	13.596	Soupe du Moment (small) TABLE 16	\N
641	indies.cafe	13.596	Soupe du Moment (small) TABLE 17	\N
642	indies.cafe	13.596	Soupe du Moment (small) TABLE 18	\N
643	indies.cafe	13.596	Soupe du Moment (small) TABLE 19	\N
644	indies.cafe	13.596	Soupe du Moment (small) TABLE 2	\N
645	indies.cafe	13.596	Soupe du Moment (small) TABLE 20	\N
646	indies.cafe	13.596	Soupe du Moment (small) TABLE 201	\N
647	indies.cafe	13.596	Soupe du Moment (small) TABLE 202	\N
648	indies.cafe	13.596	Soupe du Moment (small) TABLE 203	\N
649	indies.cafe	13.596	Soupe du Moment (small) TABLE 204	\N
650	indies.cafe	13.596	Soupe du Moment (small) TABLE 205	\N
651	indies.cafe	13.596	Soupe du Moment (small) TABLE 206	\N
652	indies.cafe	13.596	Soupe du Moment (small) TABLE 207	\N
653	indies.cafe	13.596	Soupe du Moment (small) TABLE 208	\N
654	indies.cafe	13.596	Soupe du Moment (small) TABLE 209	\N
655	indies.cafe	13.596	Soupe du Moment (small) TABLE 21	\N
656	indies.cafe	13.596	Soupe du Moment (small) TABLE 210	\N
657	indies.cafe	13.596	Soupe du Moment (small) TABLE 211	\N
658	indies.cafe	13.596	Soupe du Moment (small) TABLE 212	\N
659	indies.cafe	13.596	Soupe du Moment (small) TABLE 213	\N
660	indies.cafe	13.596	Soupe du Moment (small) TABLE 214	\N
661	indies.cafe	13.596	Soupe du Moment (small) TABLE 215	\N
662	indies.cafe	13.596	Soupe du Moment (small) TABLE 216	\N
663	indies.cafe	13.596	Soupe du Moment (small) TABLE 217	\N
664	indies.cafe	13.596	Soupe du Moment (small) TABLE 218	\N
665	indies.cafe	13.596	Soupe du Moment (small) TABLE 22	\N
666	indies.cafe	13.596	Soupe du Moment (small) TABLE 23	\N
667	indies.cafe	13.596	Soupe du Moment (small) TABLE 24	\N
668	indies.cafe	13.596	Soupe du Moment (small) TABLE 25	\N
669	indies.cafe	13.596	Soupe du Moment (small) TABLE 26	\N
670	indies.cafe	13.596	Soupe du Moment (small) TABLE 27	\N
671	indies.cafe	13.596	Soupe du Moment (small) TABLE 3	\N
672	indies.cafe	13.596	Soupe du Moment (small) TABLE 301	\N
673	indies.cafe	13.596	Soupe du Moment (small) TABLE 302	\N
674	indies.cafe	13.596	Soupe du Moment (small) TABLE 303	\N
675	indies.cafe	13.596	Soupe du Moment (small) TABLE 304	\N
676	indies.cafe	13.596	Soupe du Moment (small) TABLE 305	\N
677	indies.cafe	13.596	Soupe du Moment (small) TABLE 306	\N
678	indies.cafe	13.596	Soupe du Moment (small) TABLE 307	\N
679	indies.cafe	13.596	Soupe du Moment (small) TABLE 308	\N
680	indies.cafe	13.596	Soupe du Moment (small) TABLE 309	\N
681	indies.cafe	13.596	Soupe du Moment (small) TABLE 310	\N
682	indies.cafe	13.596	Soupe du Moment (small) TABLE 311	\N
683	indies.cafe	13.596	Soupe du Moment (small) TABLE 312	\N
684	indies.cafe	13.596	Soupe du Moment (small) TABLE 313	\N
685	indies.cafe	13.596	Soupe du Moment (small) TABLE 314	\N
686	indies.cafe	13.596	Soupe du Moment (small) TABLE 315	\N
687	indies.cafe	13.596	Soupe du Moment (small) TABLE 316	\N
688	indies.cafe	13.596	Soupe du Moment (small) TABLE 317	\N
689	indies.cafe	13.596	Soupe du Moment (small) TABLE 318	\N
690	indies.cafe	13.596	Soupe du Moment (small) TABLE 319	\N
691	indies.cafe	13.596	Soupe du Moment (small) TABLE 320	\N
692	indies.cafe	13.596	Soupe du Moment (small) TABLE 321	\N
693	indies.cafe	13.596	Soupe du Moment (small) TABLE 322	\N
694	indies.cafe	13.596	Soupe du Moment (small) TABLE 323	\N
695	indies.cafe	13.596	Soupe du Moment (small) TABLE 4	\N
696	indies.cafe	13.596	Soupe du Moment (small) TABLE 5	\N
697	indies.cafe	13.596	Soupe du Moment (small) TABLE 6	\N
698	indies.cafe	13.596	Soupe du Moment (small) TABLE 7	\N
699	indies.cafe	13.596	Soupe du Moment (small) TABLE 8	\N
700	indies.cafe	13.596	Soupe du Moment (small) TABLE 9	\N
701	indies.cafe	15.862	Soupe du Moment (large) TABLE 1	\N
702	indies.cafe	15.862	Soupe du Moment (large) TABLE 10	\N
703	indies.cafe	15.862	Soupe du Moment (large) TABLE 11	\N
704	indies.cafe	15.862	Soupe du Moment (large) TABLE 12	\N
705	indies.cafe	15.862	Soupe du Moment (large) TABLE 13	\N
706	indies.cafe	15.862	Soupe du Moment (large) TABLE 14	\N
707	indies.cafe	15.862	Soupe du Moment (large) TABLE 141	\N
708	indies.cafe	15.862	Soupe du Moment (large) TABLE 142	\N
709	indies.cafe	15.862	Soupe du Moment (large) TABLE 15	\N
710	indies.cafe	15.862	Soupe du Moment (large) TABLE 16	\N
711	indies.cafe	15.862	Soupe du Moment (large) TABLE 17	\N
712	indies.cafe	15.862	Soupe du Moment (large) TABLE 18	\N
713	indies.cafe	15.862	Soupe du Moment (large) TABLE 19	\N
714	indies.cafe	15.862	Soupe du Moment (large) TABLE 2	\N
715	indies.cafe	15.862	Soupe du Moment (large) TABLE 20	\N
716	indies.cafe	15.862	Soupe du Moment (large) TABLE 201	\N
717	indies.cafe	15.862	Soupe du Moment (large) TABLE 202	\N
718	indies.cafe	15.862	Soupe du Moment (large) TABLE 203	\N
719	indies.cafe	15.862	Soupe du Moment (large) TABLE 204	\N
720	indies.cafe	15.862	Soupe du Moment (large) TABLE 205	\N
721	indies.cafe	15.862	Soupe du Moment (large) TABLE 206	\N
722	indies.cafe	15.862	Soupe du Moment (large) TABLE 207	\N
723	indies.cafe	15.862	Soupe du Moment (large) TABLE 208	\N
724	indies.cafe	15.862	Soupe du Moment (large) TABLE 209	\N
725	indies.cafe	15.862	Soupe du Moment (large) TABLE 21	\N
726	indies.cafe	15.862	Soupe du Moment (large) TABLE 210	\N
727	indies.cafe	15.862	Soupe du Moment (large) TABLE 211	\N
728	indies.cafe	15.862	Soupe du Moment (large) TABLE 212	\N
729	indies.cafe	15.862	Soupe du Moment (large) TABLE 213	\N
730	indies.cafe	15.862	Soupe du Moment (large) TABLE 214	\N
731	indies.cafe	15.862	Soupe du Moment (large) TABLE 215	\N
732	indies.cafe	15.862	Soupe du Moment (large) TABLE 216	\N
733	indies.cafe	15.862	Soupe du Moment (large) TABLE 217	\N
734	indies.cafe	15.862	Soupe du Moment (large) TABLE 218	\N
735	indies.cafe	15.862	Soupe du Moment (large) TABLE 22	\N
736	indies.cafe	15.862	Soupe du Moment (large) TABLE 23	\N
737	indies.cafe	15.862	Soupe du Moment (large) TABLE 24	\N
738	indies.cafe	15.862	Soupe du Moment (large) TABLE 25	\N
739	indies.cafe	15.862	Soupe du Moment (large) TABLE 26	\N
740	indies.cafe	15.862	Soupe du Moment (large) TABLE 27	\N
741	indies.cafe	15.862	Soupe du Moment (large) TABLE 3	\N
742	indies.cafe	15.862	Soupe du Moment (large) TABLE 301	\N
743	indies.cafe	15.862	Soupe du Moment (large) TABLE 302	\N
744	indies.cafe	15.862	Soupe du Moment (large) TABLE 303	\N
745	indies.cafe	15.862	Soupe du Moment (large) TABLE 304	\N
746	indies.cafe	15.862	Soupe du Moment (large) TABLE 305	\N
747	indies.cafe	15.862	Soupe du Moment (large) TABLE 306	\N
748	indies.cafe	15.862	Soupe du Moment (large) TABLE 307	\N
749	indies.cafe	15.862	Soupe du Moment (large) TABLE 308	\N
750	indies.cafe	15.862	Soupe du Moment (large) TABLE 309	\N
751	indies.cafe	15.862	Soupe du Moment (large) TABLE 310	\N
752	indies.cafe	15.862	Soupe du Moment (large) TABLE 311	\N
753	indies.cafe	15.862	Soupe du Moment (large) TABLE 312	\N
754	indies.cafe	15.862	Soupe du Moment (large) TABLE 313	\N
755	indies.cafe	15.862	Soupe du Moment (large) TABLE 314	\N
756	indies.cafe	15.862	Soupe du Moment (large) TABLE 315	\N
757	indies.cafe	15.862	Soupe du Moment (large) TABLE 316	\N
758	indies.cafe	15.862	Soupe du Moment (large) TABLE 317	\N
759	indies.cafe	15.862	Soupe du Moment (large) TABLE 318	\N
760	indies.cafe	15.862	Soupe du Moment (large) TABLE 319	\N
761	indies.cafe	15.862	Soupe du Moment (large) TABLE 320	\N
762	indies.cafe	15.862	Soupe du Moment (large) TABLE 321	\N
763	indies.cafe	15.862	Soupe du Moment (large) TABLE 322	\N
764	indies.cafe	15.862	Soupe du Moment (large) TABLE 323	\N
765	indies.cafe	15.862	Soupe du Moment (large) TABLE 4	\N
766	indies.cafe	15.862	Soupe du Moment (large) TABLE 5	\N
767	indies.cafe	15.862	Soupe du Moment (large) TABLE 6	\N
768	indies.cafe	15.862	Soupe du Moment (large) TABLE 7	\N
769	indies.cafe	15.862	Soupe du Moment (large) TABLE 8	\N
770	indies.cafe	15.862	Soupe du Moment (large) TABLE 9	\N
771	indies.cafe	24.360	Cheeseburger TABLE 1	\N
772	indies.cafe	24.360	Cheeseburger TABLE 10	\N
773	indies.cafe	24.360	Cheeseburger TABLE 11	\N
774	indies.cafe	24.360	Cheeseburger TABLE 12	\N
775	indies.cafe	24.360	Cheeseburger TABLE 13	\N
776	indies.cafe	24.360	Cheeseburger TABLE 14	\N
777	indies.cafe	24.360	Cheeseburger TABLE 141	\N
778	indies.cafe	24.360	Cheeseburger TABLE 142	\N
779	indies.cafe	24.360	Cheeseburger TABLE 15	\N
780	indies.cafe	24.360	Cheeseburger TABLE 16	\N
781	indies.cafe	24.360	Cheeseburger TABLE 17	\N
782	indies.cafe	24.360	Cheeseburger TABLE 18	\N
783	indies.cafe	24.360	Cheeseburger TABLE 19	\N
784	indies.cafe	24.360	Cheeseburger TABLE 2	\N
785	indies.cafe	24.360	Cheeseburger TABLE 20	\N
786	indies.cafe	24.360	Cheeseburger TABLE 201	\N
787	indies.cafe	24.360	Cheeseburger TABLE 202	\N
788	indies.cafe	24.360	Cheeseburger TABLE 203	\N
789	indies.cafe	24.360	Cheeseburger TABLE 204	\N
790	indies.cafe	24.360	Cheeseburger TABLE 205	\N
791	indies.cafe	24.360	Cheeseburger TABLE 206	\N
792	indies.cafe	24.360	Cheeseburger TABLE 207	\N
793	indies.cafe	24.360	Cheeseburger TABLE 208	\N
794	indies.cafe	24.360	Cheeseburger TABLE 209	\N
795	indies.cafe	24.360	Cheeseburger TABLE 21	\N
796	indies.cafe	24.360	Cheeseburger TABLE 210	\N
797	indies.cafe	24.360	Cheeseburger TABLE 211	\N
798	indies.cafe	24.360	Cheeseburger TABLE 212	\N
799	indies.cafe	24.360	Cheeseburger TABLE 213	\N
800	indies.cafe	24.360	Cheeseburger TABLE 214	\N
801	indies.cafe	24.360	Cheeseburger TABLE 215	\N
802	indies.cafe	24.360	Cheeseburger TABLE 216	\N
803	indies.cafe	24.360	Cheeseburger TABLE 217	\N
804	indies.cafe	24.360	Cheeseburger TABLE 218	\N
805	indies.cafe	24.360	Cheeseburger TABLE 22	\N
806	indies.cafe	24.360	Cheeseburger TABLE 23	\N
807	indies.cafe	24.360	Cheeseburger TABLE 24	\N
808	indies.cafe	24.360	Cheeseburger TABLE 25	\N
809	indies.cafe	24.360	Cheeseburger TABLE 26	\N
810	indies.cafe	24.360	Cheeseburger TABLE 27	\N
811	indies.cafe	24.360	Cheeseburger TABLE 3	\N
812	indies.cafe	24.360	Cheeseburger TABLE 301	\N
813	indies.cafe	24.360	Cheeseburger TABLE 302	\N
814	indies.cafe	24.360	Cheeseburger TABLE 303	\N
815	indies.cafe	24.360	Cheeseburger TABLE 304	\N
816	indies.cafe	24.360	Cheeseburger TABLE 305	\N
817	indies.cafe	24.360	Cheeseburger TABLE 306	\N
818	indies.cafe	24.360	Cheeseburger TABLE 307	\N
819	indies.cafe	24.360	Cheeseburger TABLE 308	\N
820	indies.cafe	24.360	Cheeseburger TABLE 309	\N
821	indies.cafe	24.360	Cheeseburger TABLE 310	\N
822	indies.cafe	24.360	Cheeseburger TABLE 311	\N
823	indies.cafe	24.360	Cheeseburger TABLE 312	\N
824	indies.cafe	24.360	Cheeseburger TABLE 313	\N
825	indies.cafe	24.360	Cheeseburger TABLE 314	\N
826	indies.cafe	24.360	Cheeseburger TABLE 315	\N
827	indies.cafe	24.360	Cheeseburger TABLE 316	\N
828	indies.cafe	24.360	Cheeseburger TABLE 317	\N
829	indies.cafe	24.360	Cheeseburger TABLE 318	\N
830	indies.cafe	24.360	Cheeseburger TABLE 319	\N
831	indies.cafe	24.360	Cheeseburger TABLE 320	\N
832	indies.cafe	24.360	Cheeseburger TABLE 321	\N
833	indies.cafe	24.360	Cheeseburger TABLE 322	\N
834	indies.cafe	24.360	Cheeseburger TABLE 323	\N
835	indies.cafe	24.360	Cheeseburger TABLE 4	\N
836	indies.cafe	24.360	Cheeseburger TABLE 5	\N
837	indies.cafe	24.360	Cheeseburger TABLE 6	\N
838	indies.cafe	24.360	Cheeseburger TABLE 7	\N
839	indies.cafe	24.360	Cheeseburger TABLE 8	\N
840	indies.cafe	24.360	Cheeseburger TABLE 9	\N
841	indies.cafe	28.212	Double Cheeseburger TABLE 1	\N
842	indies.cafe	28.212	Double Cheeseburger TABLE 10	\N
843	indies.cafe	28.212	Double Cheeseburger TABLE 11	\N
844	indies.cafe	28.212	Double Cheeseburger TABLE 12	\N
845	indies.cafe	28.212	Double Cheeseburger TABLE 13	\N
846	indies.cafe	28.212	Double Cheeseburger TABLE 14	\N
847	indies.cafe	28.212	Double Cheeseburger TABLE 141	\N
848	indies.cafe	28.212	Double Cheeseburger TABLE 142	\N
849	indies.cafe	28.212	Double Cheeseburger TABLE 15	\N
850	indies.cafe	28.212	Double Cheeseburger TABLE 16	\N
851	indies.cafe	28.212	Double Cheeseburger TABLE 17	\N
852	indies.cafe	28.212	Double Cheeseburger TABLE 18	\N
853	indies.cafe	28.212	Double Cheeseburger TABLE 19	\N
854	indies.cafe	28.212	Double Cheeseburger TABLE 2	\N
855	indies.cafe	28.212	Double Cheeseburger TABLE 20	\N
856	indies.cafe	28.212	Double Cheeseburger TABLE 201	\N
857	indies.cafe	28.212	Double Cheeseburger TABLE 202	\N
858	indies.cafe	28.212	Double Cheeseburger TABLE 203	\N
859	indies.cafe	28.212	Double Cheeseburger TABLE 204	\N
860	indies.cafe	28.212	Double Cheeseburger TABLE 205	\N
861	indies.cafe	28.212	Double Cheeseburger TABLE 206	\N
862	indies.cafe	28.212	Double Cheeseburger TABLE 207	\N
863	indies.cafe	28.212	Double Cheeseburger TABLE 208	\N
864	indies.cafe	28.212	Double Cheeseburger TABLE 209	\N
865	indies.cafe	28.212	Double Cheeseburger TABLE 21	\N
866	indies.cafe	28.212	Double Cheeseburger TABLE 210	\N
867	indies.cafe	28.212	Double Cheeseburger TABLE 211	\N
868	indies.cafe	28.212	Double Cheeseburger TABLE 212	\N
869	indies.cafe	28.212	Double Cheeseburger TABLE 213	\N
870	indies.cafe	28.212	Double Cheeseburger TABLE 214	\N
871	indies.cafe	28.212	Double Cheeseburger TABLE 215	\N
872	indies.cafe	28.212	Double Cheeseburger TABLE 216	\N
873	indies.cafe	28.212	Double Cheeseburger TABLE 217	\N
874	indies.cafe	28.212	Double Cheeseburger TABLE 218	\N
875	indies.cafe	28.212	Double Cheeseburger TABLE 22	\N
876	indies.cafe	28.212	Double Cheeseburger TABLE 23	\N
877	indies.cafe	28.212	Double Cheeseburger TABLE 24	\N
878	indies.cafe	28.212	Double Cheeseburger TABLE 25	\N
879	indies.cafe	28.212	Double Cheeseburger TABLE 26	\N
880	indies.cafe	28.212	Double Cheeseburger TABLE 27	\N
881	indies.cafe	28.212	Double Cheeseburger TABLE 3	\N
882	indies.cafe	28.212	Double Cheeseburger TABLE 301	\N
883	indies.cafe	28.212	Double Cheeseburger TABLE 302	\N
884	indies.cafe	28.212	Double Cheeseburger TABLE 303	\N
885	indies.cafe	28.212	Double Cheeseburger TABLE 304	\N
886	indies.cafe	28.212	Double Cheeseburger TABLE 305	\N
887	indies.cafe	28.212	Double Cheeseburger TABLE 306	\N
888	indies.cafe	28.212	Double Cheeseburger TABLE 307	\N
889	indies.cafe	28.212	Double Cheeseburger TABLE 308	\N
890	indies.cafe	28.212	Double Cheeseburger TABLE 309	\N
891	indies.cafe	28.212	Double Cheeseburger TABLE 310	\N
892	indies.cafe	28.212	Double Cheeseburger TABLE 311	\N
893	indies.cafe	28.212	Double Cheeseburger TABLE 312	\N
894	indies.cafe	28.212	Double Cheeseburger TABLE 313	\N
895	indies.cafe	28.212	Double Cheeseburger TABLE 314	\N
896	indies.cafe	28.212	Double Cheeseburger TABLE 315	\N
897	indies.cafe	28.212	Double Cheeseburger TABLE 316	\N
898	indies.cafe	28.212	Double Cheeseburger TABLE 317	\N
899	indies.cafe	28.212	Double Cheeseburger TABLE 318	\N
900	indies.cafe	28.212	Double Cheeseburger TABLE 319	\N
901	indies.cafe	28.212	Double Cheeseburger TABLE 320	\N
902	indies.cafe	28.212	Double Cheeseburger TABLE 321	\N
903	indies.cafe	28.212	Double Cheeseburger TABLE 322	\N
904	indies.cafe	28.212	Double Cheeseburger TABLE 323	\N
905	indies.cafe	28.212	Double Cheeseburger TABLE 4	\N
906	indies.cafe	28.212	Double Cheeseburger TABLE 5	\N
907	indies.cafe	28.212	Double Cheeseburger TABLE 6	\N
908	indies.cafe	28.212	Double Cheeseburger TABLE 7	\N
909	indies.cafe	28.212	Double Cheeseburger TABLE 8	\N
910	indies.cafe	28.212	Double Cheeseburger TABLE 9	\N
911	indies.cafe	26.059	Bronx Burger TABLE 1	\N
912	indies.cafe	26.059	Bronx Burger TABLE 10	\N
913	indies.cafe	26.059	Bronx Burger TABLE 11	\N
914	indies.cafe	26.059	Bronx Burger TABLE 12	\N
915	indies.cafe	26.059	Bronx Burger TABLE 13	\N
916	indies.cafe	26.059	Bronx Burger TABLE 14	\N
917	indies.cafe	26.059	Bronx Burger TABLE 141	\N
918	indies.cafe	26.059	Bronx Burger TABLE 142	\N
919	indies.cafe	26.059	Bronx Burger TABLE 15	\N
920	indies.cafe	26.059	Bronx Burger TABLE 16	\N
921	indies.cafe	26.059	Bronx Burger TABLE 17	\N
922	indies.cafe	26.059	Bronx Burger TABLE 18	\N
923	indies.cafe	26.059	Bronx Burger TABLE 19	\N
924	indies.cafe	26.059	Bronx Burger TABLE 2	\N
925	indies.cafe	26.059	Bronx Burger TABLE 20	\N
926	indies.cafe	26.059	Bronx Burger TABLE 201	\N
927	indies.cafe	26.059	Bronx Burger TABLE 202	\N
928	indies.cafe	26.059	Bronx Burger TABLE 203	\N
929	indies.cafe	26.059	Bronx Burger TABLE 204	\N
930	indies.cafe	26.059	Bronx Burger TABLE 205	\N
931	indies.cafe	26.059	Bronx Burger TABLE 206	\N
932	indies.cafe	26.059	Bronx Burger TABLE 207	\N
933	indies.cafe	26.059	Bronx Burger TABLE 208	\N
934	indies.cafe	26.059	Bronx Burger TABLE 209	\N
935	indies.cafe	26.059	Bronx Burger TABLE 21	\N
936	indies.cafe	26.059	Bronx Burger TABLE 210	\N
937	indies.cafe	26.059	Bronx Burger TABLE 211	\N
938	indies.cafe	26.059	Bronx Burger TABLE 212	\N
939	indies.cafe	26.059	Bronx Burger TABLE 213	\N
940	indies.cafe	26.059	Bronx Burger TABLE 214	\N
941	indies.cafe	26.059	Bronx Burger TABLE 215	\N
942	indies.cafe	26.059	Bronx Burger TABLE 216	\N
943	indies.cafe	26.059	Bronx Burger TABLE 217	\N
944	indies.cafe	26.059	Bronx Burger TABLE 218	\N
945	indies.cafe	26.059	Bronx Burger TABLE 22	\N
946	indies.cafe	26.059	Bronx Burger TABLE 23	\N
947	indies.cafe	26.059	Bronx Burger TABLE 24	\N
948	indies.cafe	26.059	Bronx Burger TABLE 25	\N
949	indies.cafe	26.059	Bronx Burger TABLE 26	\N
950	indies.cafe	26.059	Bronx Burger TABLE 27	\N
951	indies.cafe	26.059	Bronx Burger TABLE 3	\N
952	indies.cafe	26.059	Bronx Burger TABLE 301	\N
953	indies.cafe	26.059	Bronx Burger TABLE 302	\N
954	indies.cafe	26.059	Bronx Burger TABLE 303	\N
955	indies.cafe	26.059	Bronx Burger TABLE 304	\N
956	indies.cafe	26.059	Bronx Burger TABLE 305	\N
957	indies.cafe	26.059	Bronx Burger TABLE 306	\N
958	indies.cafe	26.059	Bronx Burger TABLE 307	\N
959	indies.cafe	26.059	Bronx Burger TABLE 308	\N
960	indies.cafe	26.059	Bronx Burger TABLE 309	\N
961	indies.cafe	26.059	Bronx Burger TABLE 310	\N
962	indies.cafe	26.059	Bronx Burger TABLE 311	\N
963	indies.cafe	26.059	Bronx Burger TABLE 312	\N
964	indies.cafe	26.059	Bronx Burger TABLE 313	\N
965	indies.cafe	26.059	Bronx Burger TABLE 314	\N
966	indies.cafe	26.059	Bronx Burger TABLE 315	\N
967	indies.cafe	26.059	Bronx Burger TABLE 316	\N
968	indies.cafe	26.059	Bronx Burger TABLE 317	\N
969	indies.cafe	26.059	Bronx Burger TABLE 318	\N
970	indies.cafe	26.059	Bronx Burger TABLE 319	\N
971	indies.cafe	26.059	Bronx Burger TABLE 320	\N
972	indies.cafe	26.059	Bronx Burger TABLE 321	\N
973	indies.cafe	26.059	Bronx Burger TABLE 322	\N
974	indies.cafe	26.059	Bronx Burger TABLE 323	\N
975	indies.cafe	26.059	Bronx Burger TABLE 4	\N
976	indies.cafe	26.059	Bronx Burger TABLE 5	\N
977	indies.cafe	26.059	Bronx Burger TABLE 6	\N
978	indies.cafe	26.059	Bronx Burger TABLE 7	\N
979	indies.cafe	26.059	Bronx Burger TABLE 8	\N
980	indies.cafe	26.059	Bronx Burger TABLE 9	\N
981	indies.cafe	29.911	Double Bronx Burger TABLE 1	\N
982	indies.cafe	29.911	Double Bronx Burger TABLE 10	\N
983	indies.cafe	29.911	Double Bronx Burger TABLE 11	\N
984	indies.cafe	29.911	Double Bronx Burger TABLE 12	\N
985	indies.cafe	29.911	Double Bronx Burger TABLE 13	\N
986	indies.cafe	29.911	Double Bronx Burger TABLE 14	\N
987	indies.cafe	29.911	Double Bronx Burger TABLE 141	\N
988	indies.cafe	29.911	Double Bronx Burger TABLE 142	\N
989	indies.cafe	29.911	Double Bronx Burger TABLE 15	\N
990	indies.cafe	29.911	Double Bronx Burger TABLE 16	\N
991	indies.cafe	29.911	Double Bronx Burger TABLE 17	\N
992	indies.cafe	29.911	Double Bronx Burger TABLE 18	\N
993	indies.cafe	29.911	Double Bronx Burger TABLE 19	\N
994	indies.cafe	29.911	Double Bronx Burger TABLE 2	\N
995	indies.cafe	29.911	Double Bronx Burger TABLE 20	\N
996	indies.cafe	29.911	Double Bronx Burger TABLE 201	\N
997	indies.cafe	29.911	Double Bronx Burger TABLE 202	\N
998	indies.cafe	29.911	Double Bronx Burger TABLE 203	\N
999	indies.cafe	29.911	Double Bronx Burger TABLE 204	\N
1000	indies.cafe	29.911	Double Bronx Burger TABLE 205	\N
1001	indies.cafe	29.911	Double Bronx Burger TABLE 206	\N
1002	indies.cafe	29.911	Double Bronx Burger TABLE 207	\N
1003	indies.cafe	29.911	Double Bronx Burger TABLE 208	\N
1004	indies.cafe	29.911	Double Bronx Burger TABLE 209	\N
1005	indies.cafe	29.911	Double Bronx Burger TABLE 21	\N
1006	indies.cafe	29.911	Double Bronx Burger TABLE 210	\N
1007	indies.cafe	29.911	Double Bronx Burger TABLE 211	\N
1008	indies.cafe	29.911	Double Bronx Burger TABLE 212	\N
1009	indies.cafe	29.911	Double Bronx Burger TABLE 213	\N
1010	indies.cafe	29.911	Double Bronx Burger TABLE 214	\N
1011	indies.cafe	29.911	Double Bronx Burger TABLE 215	\N
1012	indies.cafe	29.911	Double Bronx Burger TABLE 216	\N
1013	indies.cafe	29.911	Double Bronx Burger TABLE 217	\N
1014	indies.cafe	29.911	Double Bronx Burger TABLE 218	\N
1015	indies.cafe	29.911	Double Bronx Burger TABLE 22	\N
1016	indies.cafe	29.911	Double Bronx Burger TABLE 23	\N
1017	indies.cafe	29.911	Double Bronx Burger TABLE 24	\N
1018	indies.cafe	29.911	Double Bronx Burger TABLE 25	\N
1019	indies.cafe	29.911	Double Bronx Burger TABLE 26	\N
1020	indies.cafe	29.911	Double Bronx Burger TABLE 27	\N
1021	indies.cafe	29.911	Double Bronx Burger TABLE 3	\N
1022	indies.cafe	29.911	Double Bronx Burger TABLE 301	\N
1023	indies.cafe	29.911	Double Bronx Burger TABLE 302	\N
1024	indies.cafe	29.911	Double Bronx Burger TABLE 303	\N
1025	indies.cafe	29.911	Double Bronx Burger TABLE 304	\N
1026	indies.cafe	29.911	Double Bronx Burger TABLE 305	\N
1027	indies.cafe	29.911	Double Bronx Burger TABLE 306	\N
1028	indies.cafe	29.911	Double Bronx Burger TABLE 307	\N
1029	indies.cafe	29.911	Double Bronx Burger TABLE 308	\N
1030	indies.cafe	29.911	Double Bronx Burger TABLE 309	\N
1031	indies.cafe	29.911	Double Bronx Burger TABLE 310	\N
1032	indies.cafe	29.911	Double Bronx Burger TABLE 311	\N
1033	indies.cafe	29.911	Double Bronx Burger TABLE 312	\N
1034	indies.cafe	29.911	Double Bronx Burger TABLE 313	\N
1035	indies.cafe	29.911	Double Bronx Burger TABLE 314	\N
1036	indies.cafe	29.911	Double Bronx Burger TABLE 315	\N
1037	indies.cafe	29.911	Double Bronx Burger TABLE 316	\N
1038	indies.cafe	29.911	Double Bronx Burger TABLE 317	\N
1039	indies.cafe	29.911	Double Bronx Burger TABLE 318	\N
1040	indies.cafe	29.911	Double Bronx Burger TABLE 319	\N
1041	indies.cafe	29.911	Double Bronx Burger TABLE 320	\N
1042	indies.cafe	29.911	Double Bronx Burger TABLE 321	\N
1043	indies.cafe	29.911	Double Bronx Burger TABLE 322	\N
1044	indies.cafe	29.911	Double Bronx Burger TABLE 323	\N
1045	indies.cafe	29.911	Double Bronx Burger TABLE 4	\N
1046	indies.cafe	29.911	Double Bronx Burger TABLE 5	\N
1047	indies.cafe	29.911	Double Bronx Burger TABLE 6	\N
1048	indies.cafe	29.911	Double Bronx Burger TABLE 7	\N
1049	indies.cafe	29.911	Double Bronx Burger TABLE 8	\N
1050	indies.cafe	29.911	Double Bronx Burger TABLE 9	\N
1051	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 1	\N
1052	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 10	\N
1053	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 11	\N
1054	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 12	\N
1055	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 13	\N
1056	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 14	\N
1057	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 141	\N
1058	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 142	\N
1059	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 15	\N
1060	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 16	\N
1061	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 17	\N
1062	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 18	\N
1063	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 19	\N
1064	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 2	\N
1065	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 20	\N
1066	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 201	\N
1067	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 202	\N
1068	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 203	\N
1069	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 204	\N
1070	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 205	\N
1071	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 206	\N
1072	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 207	\N
1073	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 208	\N
1074	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 209	\N
1075	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 21	\N
1076	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 210	\N
1077	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 211	\N
1078	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 212	\N
1079	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 213	\N
1080	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 214	\N
1081	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 215	\N
1082	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 216	\N
1083	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 217	\N
1084	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 218	\N
1085	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 22	\N
1086	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 23	\N
1087	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 24	\N
1088	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 25	\N
1089	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 26	\N
1090	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 27	\N
1091	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 3	\N
1092	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 301	\N
1093	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 302	\N
1094	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 303	\N
1095	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 304	\N
1096	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 305	\N
1097	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 306	\N
1098	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 307	\N
1099	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 308	\N
1100	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 309	\N
1101	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 310	\N
1102	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 311	\N
1103	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 312	\N
1104	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 313	\N
1105	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 314	\N
1106	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 315	\N
1107	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 316	\N
1108	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 317	\N
1109	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 318	\N
1110	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 319	\N
1111	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 320	\N
1112	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 321	\N
1113	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 322	\N
1114	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 323	\N
1115	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 4	\N
1116	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 5	\N
1117	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 6	\N
1118	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 7	\N
1119	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 8	\N
1120	indies.cafe	29.345	Entrecote "Rib-Eye" de Boeuf "Simmental" 350Gr TABLE 9	\N
1121	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 1	\N
1122	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 10	\N
1123	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 11	\N
1124	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 12	\N
1125	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 13	\N
1126	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 14	\N
1127	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 141	\N
1128	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 142	\N
1129	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 15	\N
1130	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 16	\N
1131	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 17	\N
1132	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 18	\N
1133	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 19	\N
1134	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 2	\N
1135	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 20	\N
1136	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 201	\N
1137	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 202	\N
1138	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 203	\N
1139	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 204	\N
1140	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 205	\N
1141	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 206	\N
1142	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 207	\N
1143	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 208	\N
1144	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 209	\N
1145	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 21	\N
1146	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 210	\N
1147	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 211	\N
1148	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 212	\N
1149	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 213	\N
1150	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 214	\N
1151	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 215	\N
1152	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 216	\N
1153	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 217	\N
1154	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 218	\N
1155	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 22	\N
1156	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 23	\N
1157	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 24	\N
1158	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 25	\N
1159	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 26	\N
1160	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 27	\N
1161	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 3	\N
1162	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 301	\N
1163	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 302	\N
1164	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 303	\N
1165	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 304	\N
1166	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 305	\N
1167	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 306	\N
1168	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 307	\N
1169	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 308	\N
1170	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 309	\N
1171	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 310	\N
1172	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 311	\N
1173	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 312	\N
1174	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 313	\N
1175	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 314	\N
1176	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 315	\N
1177	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 316	\N
1178	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 317	\N
1179	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 318	\N
1180	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 319	\N
1181	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 320	\N
1182	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 321	\N
1183	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 322	\N
1184	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 323	\N
1185	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 4	\N
1186	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 5	\N
1187	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 6	\N
1188	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 7	\N
1189	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 8	\N
1190	indies.cafe	13.596	Pavlova fraises fraiches, creme de pistache, meringue TABLE 9	\N
1191	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 1	\N
1192	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 10	\N
1193	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 11	\N
1194	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 12	\N
1195	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 13	\N
1196	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 14	\N
1197	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 141	\N
1198	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 142	\N
1199	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 15	\N
1200	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 16	\N
1201	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 17	\N
1202	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 18	\N
1203	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 19	\N
1204	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 2	\N
1205	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 20	\N
1206	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 201	\N
1207	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 202	\N
1208	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 203	\N
1209	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 204	\N
1210	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 205	\N
1211	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 206	\N
1212	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 207	\N
1213	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 208	\N
1214	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 209	\N
1215	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 21	\N
1216	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 210	\N
1217	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 211	\N
1218	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 212	\N
1219	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 213	\N
1220	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 214	\N
1221	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 215	\N
1222	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 216	\N
1223	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 217	\N
1224	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 218	\N
1225	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 22	\N
1226	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 23	\N
1227	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 24	\N
1228	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 25	\N
1229	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 26	\N
1230	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 27	\N
1231	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 3	\N
1232	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 301	\N
1233	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 302	\N
1234	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 303	\N
1235	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 304	\N
1236	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 305	\N
1237	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 306	\N
1238	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 307	\N
1239	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 308	\N
1240	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 309	\N
1241	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 310	\N
1242	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 311	\N
1243	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 312	\N
1244	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 313	\N
1245	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 314	\N
1246	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 315	\N
1247	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 316	\N
1248	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 317	\N
1249	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 318	\N
1250	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 319	\N
1251	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 320	\N
1252	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 321	\N
1253	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 322	\N
1254	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 323	\N
1255	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 4	\N
1256	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 5	\N
1257	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 6	\N
1258	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 7	\N
1259	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 8	\N
1260	indies.cafe	32.857	Planchette "Fingers Food" et frites fraiches TABLE 9	\N
1261	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 1	\N
1262	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 10	\N
1263	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 11	\N
1264	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 12	\N
1265	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 13	\N
1266	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 14	\N
1267	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 141	\N
1268	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 142	\N
1269	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 15	\N
1270	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 16	\N
1271	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 17	\N
1272	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 18	\N
1273	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 19	\N
1274	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 2	\N
1275	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 20	\N
1276	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 201	\N
1277	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 202	\N
1278	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 203	\N
1279	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 204	\N
1280	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 205	\N
1281	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 206	\N
1282	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 207	\N
1283	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 208	\N
1284	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 209	\N
1285	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 21	\N
1286	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 210	\N
1287	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 211	\N
1288	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 212	\N
1289	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 213	\N
1290	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 214	\N
1291	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 215	\N
1292	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 216	\N
1293	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 217	\N
1294	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 218	\N
1295	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 22	\N
1296	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 23	\N
1297	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 24	\N
1298	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 25	\N
1299	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 26	\N
1300	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 27	\N
1301	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 3	\N
1302	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 301	\N
1303	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 302	\N
1304	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 303	\N
1305	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 304	\N
1306	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 305	\N
1307	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 306	\N
1308	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 307	\N
1309	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 308	\N
1310	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 309	\N
1311	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 310	\N
1312	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 311	\N
1313	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 312	\N
1314	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 313	\N
1315	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 314	\N
1316	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 315	\N
1317	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 316	\N
1318	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 317	\N
1319	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 318	\N
1320	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 319	\N
1321	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 320	\N
1322	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 321	\N
1323	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 322	\N
1324	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 323	\N
1325	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 4	\N
1326	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 5	\N
1327	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 6	\N
1328	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 7	\N
1329	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 8	\N
1330	indies.cafe	8.498	Nuggets Maison sauce tartare TABLE 9	\N
1331	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 1	\N
1332	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 10	\N
1333	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 11	\N
1334	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 12	\N
1335	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 13	\N
1336	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 14	\N
1337	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 141	\N
1338	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 142	\N
1339	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 15	\N
1340	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 16	\N
1341	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 17	\N
1342	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 18	\N
1343	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 19	\N
1344	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 2	\N
1345	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 20	\N
1346	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 201	\N
1347	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 202	\N
1348	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 203	\N
1349	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 204	\N
1350	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 205	\N
1351	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 206	\N
1352	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 207	\N
1353	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 208	\N
1354	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 209	\N
1355	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 21	\N
1356	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 210	\N
1357	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 211	\N
1358	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 212	\N
1359	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 213	\N
1360	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 214	\N
1361	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 215	\N
1362	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 216	\N
1363	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 217	\N
1364	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 218	\N
1365	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 22	\N
1366	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 23	\N
1367	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 24	\N
1368	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 25	\N
1369	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 26	\N
1370	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 27	\N
1371	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 3	\N
1372	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 301	\N
1373	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 302	\N
1374	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 303	\N
1375	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 304	\N
1376	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 305	\N
1377	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 306	\N
1378	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 307	\N
1379	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 308	\N
1380	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 309	\N
1381	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 310	\N
1382	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 311	\N
1383	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 312	\N
1384	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 313	\N
1385	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 314	\N
1386	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 315	\N
1387	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 316	\N
1388	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 317	\N
1389	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 318	\N
1390	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 319	\N
1391	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 320	\N
1392	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 321	\N
1393	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 322	\N
1394	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 323	\N
1395	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 4	\N
1396	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 5	\N
1397	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 6	\N
1398	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 7	\N
1399	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 8	\N
1400	indies.cafe	18.128	Chili Chicken Wings "Good Bye My Lips" (8pc) TABLE 9	\N
1401	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 1	\N
1402	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 10	\N
1403	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 11	\N
1404	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 12	\N
1405	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 13	\N
1406	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 14	\N
1407	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 141	\N
1408	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 142	\N
1409	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 15	\N
1410	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 16	\N
1411	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 17	\N
1412	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 18	\N
1413	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 19	\N
1414	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 2	\N
1415	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 20	\N
1416	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 201	\N
1417	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 202	\N
1418	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 203	\N
1419	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 204	\N
1420	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 205	\N
1421	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 206	\N
1422	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 207	\N
1423	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 208	\N
1424	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 209	\N
1425	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 21	\N
1426	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 210	\N
1427	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 211	\N
1428	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 212	\N
1429	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 213	\N
1430	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 214	\N
1431	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 215	\N
1432	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 216	\N
1433	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 217	\N
1434	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 218	\N
1435	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 22	\N
1436	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 23	\N
1437	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 24	\N
1438	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 25	\N
1439	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 26	\N
1440	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 27	\N
1441	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 3	\N
1442	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 301	\N
1443	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 302	\N
1444	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 303	\N
1445	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 304	\N
1446	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 305	\N
1447	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 306	\N
1448	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 307	\N
1449	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 308	\N
1450	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 309	\N
1451	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 310	\N
1452	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 311	\N
1453	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 312	\N
1454	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 313	\N
1455	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 314	\N
1456	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 315	\N
1457	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 316	\N
1458	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 317	\N
1459	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 318	\N
1460	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 319	\N
1461	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 320	\N
1462	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 321	\N
1463	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 322	\N
1464	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 323	\N
1465	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 4	\N
1466	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 5	\N
1467	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 6	\N
1468	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 7	\N
1469	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 8	\N
1470	indies.cafe	7.365	La Plume Blanche "Henri RUPPERT" standard TABLE 9	\N
1471	indies.cafe	4.419	Simon Pils 25cl TABLE 1	\N
1472	indies.cafe	4.419	Simon Pils 25cl TABLE 10	\N
1473	indies.cafe	4.419	Simon Pils 25cl TABLE 11	\N
1474	indies.cafe	4.419	Simon Pils 25cl TABLE 12	\N
1475	indies.cafe	4.419	Simon Pils 25cl TABLE 13	\N
1476	indies.cafe	4.419	Simon Pils 25cl TABLE 14	\N
1477	indies.cafe	4.419	Simon Pils 25cl TABLE 141	\N
1478	indies.cafe	4.419	Simon Pils 25cl TABLE 142	\N
1479	indies.cafe	4.419	Simon Pils 25cl TABLE 15	\N
1480	indies.cafe	4.419	Simon Pils 25cl TABLE 16	\N
1481	indies.cafe	4.419	Simon Pils 25cl TABLE 17	\N
1482	indies.cafe	4.419	Simon Pils 25cl TABLE 18	\N
1483	indies.cafe	4.419	Simon Pils 25cl TABLE 19	\N
1484	indies.cafe	4.419	Simon Pils 25cl TABLE 2	\N
1485	indies.cafe	4.419	Simon Pils 25cl TABLE 20	\N
1486	indies.cafe	4.419	Simon Pils 25cl TABLE 201	\N
1487	indies.cafe	4.419	Simon Pils 25cl TABLE 202	\N
1488	indies.cafe	4.419	Simon Pils 25cl TABLE 203	\N
1489	indies.cafe	4.419	Simon Pils 25cl TABLE 204	\N
1490	indies.cafe	4.419	Simon Pils 25cl TABLE 205	\N
1491	indies.cafe	4.419	Simon Pils 25cl TABLE 206	\N
1492	indies.cafe	4.419	Simon Pils 25cl TABLE 207	\N
1493	indies.cafe	4.419	Simon Pils 25cl TABLE 208	\N
1494	indies.cafe	4.419	Simon Pils 25cl TABLE 209	\N
1495	indies.cafe	4.419	Simon Pils 25cl TABLE 21	\N
1496	indies.cafe	4.419	Simon Pils 25cl TABLE 210	\N
1497	indies.cafe	4.419	Simon Pils 25cl TABLE 211	\N
1498	indies.cafe	4.419	Simon Pils 25cl TABLE 212	\N
1499	indies.cafe	4.419	Simon Pils 25cl TABLE 213	\N
1500	indies.cafe	4.419	Simon Pils 25cl TABLE 214	\N
1501	indies.cafe	4.419	Simon Pils 25cl TABLE 215	\N
1502	indies.cafe	4.419	Simon Pils 25cl TABLE 216	\N
1503	indies.cafe	4.419	Simon Pils 25cl TABLE 217	\N
1504	indies.cafe	4.419	Simon Pils 25cl TABLE 218	\N
1505	indies.cafe	4.419	Simon Pils 25cl TABLE 22	\N
1506	indies.cafe	4.419	Simon Pils 25cl TABLE 23	\N
1507	indies.cafe	4.419	Simon Pils 25cl TABLE 24	\N
1508	indies.cafe	4.419	Simon Pils 25cl TABLE 25	\N
1509	indies.cafe	4.419	Simon Pils 25cl TABLE 26	\N
1510	indies.cafe	4.419	Simon Pils 25cl TABLE 27	\N
1511	indies.cafe	4.419	Simon Pils 25cl TABLE 3	\N
1512	indies.cafe	4.419	Simon Pils 25cl TABLE 301	\N
1513	indies.cafe	4.419	Simon Pils 25cl TABLE 302	\N
1514	indies.cafe	4.419	Simon Pils 25cl TABLE 303	\N
1515	indies.cafe	4.419	Simon Pils 25cl TABLE 304	\N
1516	indies.cafe	4.419	Simon Pils 25cl TABLE 305	\N
1517	indies.cafe	4.419	Simon Pils 25cl TABLE 306	\N
1518	indies.cafe	4.419	Simon Pils 25cl TABLE 307	\N
1519	indies.cafe	4.419	Simon Pils 25cl TABLE 308	\N
1520	indies.cafe	4.419	Simon Pils 25cl TABLE 309	\N
1521	indies.cafe	4.419	Simon Pils 25cl TABLE 310	\N
1522	indies.cafe	4.419	Simon Pils 25cl TABLE 311	\N
1523	indies.cafe	4.419	Simon Pils 25cl TABLE 312	\N
1524	indies.cafe	4.419	Simon Pils 25cl TABLE 313	\N
1525	indies.cafe	4.419	Simon Pils 25cl TABLE 314	\N
1526	indies.cafe	4.419	Simon Pils 25cl TABLE 315	\N
1527	indies.cafe	4.419	Simon Pils 25cl TABLE 316	\N
1528	indies.cafe	4.419	Simon Pils 25cl TABLE 317	\N
1529	indies.cafe	4.419	Simon Pils 25cl TABLE 318	\N
1530	indies.cafe	4.419	Simon Pils 25cl TABLE 319	\N
1531	indies.cafe	4.419	Simon Pils 25cl TABLE 320	\N
1532	indies.cafe	4.419	Simon Pils 25cl TABLE 321	\N
1533	indies.cafe	4.419	Simon Pils 25cl TABLE 322	\N
1534	indies.cafe	4.419	Simon Pils 25cl TABLE 323	\N
1535	indies.cafe	4.419	Simon Pils 25cl TABLE 4	\N
1536	indies.cafe	4.419	Simon Pils 25cl TABLE 5	\N
1537	indies.cafe	4.419	Simon Pils 25cl TABLE 6	\N
1538	indies.cafe	4.419	Simon Pils 25cl TABLE 7	\N
1539	indies.cafe	4.419	Simon Pils 25cl TABLE 8	\N
1540	indies.cafe	4.419	Simon Pils 25cl TABLE 9	\N
1541	indies.cafe	8.158	Simon Pils 50cl TABLE 1	\N
1542	indies.cafe	8.158	Simon Pils 50cl TABLE 10	\N
1543	indies.cafe	8.158	Simon Pils 50cl TABLE 11	\N
1544	indies.cafe	8.158	Simon Pils 50cl TABLE 12	\N
1545	indies.cafe	8.158	Simon Pils 50cl TABLE 13	\N
1546	indies.cafe	8.158	Simon Pils 50cl TABLE 14	\N
1547	indies.cafe	8.158	Simon Pils 50cl TABLE 141	\N
1548	indies.cafe	8.158	Simon Pils 50cl TABLE 142	\N
1549	indies.cafe	8.158	Simon Pils 50cl TABLE 15	\N
1550	indies.cafe	8.158	Simon Pils 50cl TABLE 16	\N
1551	indies.cafe	8.158	Simon Pils 50cl TABLE 17	\N
1552	indies.cafe	8.158	Simon Pils 50cl TABLE 18	\N
1553	indies.cafe	8.158	Simon Pils 50cl TABLE 19	\N
1554	indies.cafe	8.158	Simon Pils 50cl TABLE 2	\N
1555	indies.cafe	8.158	Simon Pils 50cl TABLE 20	\N
1556	indies.cafe	8.158	Simon Pils 50cl TABLE 201	\N
1557	indies.cafe	8.158	Simon Pils 50cl TABLE 202	\N
1558	indies.cafe	8.158	Simon Pils 50cl TABLE 203	\N
1559	indies.cafe	8.158	Simon Pils 50cl TABLE 204	\N
1560	indies.cafe	8.158	Simon Pils 50cl TABLE 205	\N
1561	indies.cafe	8.158	Simon Pils 50cl TABLE 206	\N
1562	indies.cafe	8.158	Simon Pils 50cl TABLE 207	\N
1563	indies.cafe	8.158	Simon Pils 50cl TABLE 208	\N
1564	indies.cafe	8.158	Simon Pils 50cl TABLE 209	\N
1565	indies.cafe	8.158	Simon Pils 50cl TABLE 21	\N
1566	indies.cafe	8.158	Simon Pils 50cl TABLE 210	\N
1567	indies.cafe	8.158	Simon Pils 50cl TABLE 211	\N
1568	indies.cafe	8.158	Simon Pils 50cl TABLE 212	\N
1569	indies.cafe	8.158	Simon Pils 50cl TABLE 213	\N
1570	indies.cafe	8.158	Simon Pils 50cl TABLE 214	\N
1571	indies.cafe	8.158	Simon Pils 50cl TABLE 215	\N
1572	indies.cafe	8.158	Simon Pils 50cl TABLE 216	\N
1573	indies.cafe	8.158	Simon Pils 50cl TABLE 217	\N
1574	indies.cafe	8.158	Simon Pils 50cl TABLE 218	\N
1575	indies.cafe	8.158	Simon Pils 50cl TABLE 22	\N
1576	indies.cafe	8.158	Simon Pils 50cl TABLE 23	\N
1577	indies.cafe	8.158	Simon Pils 50cl TABLE 24	\N
1578	indies.cafe	8.158	Simon Pils 50cl TABLE 25	\N
1579	indies.cafe	8.158	Simon Pils 50cl TABLE 26	\N
1580	indies.cafe	8.158	Simon Pils 50cl TABLE 27	\N
1581	indies.cafe	8.158	Simon Pils 50cl TABLE 3	\N
1582	indies.cafe	8.158	Simon Pils 50cl TABLE 301	\N
1583	indies.cafe	8.158	Simon Pils 50cl TABLE 302	\N
1584	indies.cafe	8.158	Simon Pils 50cl TABLE 303	\N
1585	indies.cafe	8.158	Simon Pils 50cl TABLE 304	\N
1586	indies.cafe	8.158	Simon Pils 50cl TABLE 305	\N
1587	indies.cafe	8.158	Simon Pils 50cl TABLE 306	\N
1588	indies.cafe	8.158	Simon Pils 50cl TABLE 307	\N
1589	indies.cafe	8.158	Simon Pils 50cl TABLE 308	\N
1590	indies.cafe	8.158	Simon Pils 50cl TABLE 309	\N
1591	indies.cafe	8.158	Simon Pils 50cl TABLE 310	\N
1592	indies.cafe	8.158	Simon Pils 50cl TABLE 311	\N
1593	indies.cafe	8.158	Simon Pils 50cl TABLE 312	\N
1594	indies.cafe	8.158	Simon Pils 50cl TABLE 313	\N
1595	indies.cafe	8.158	Simon Pils 50cl TABLE 314	\N
1596	indies.cafe	8.158	Simon Pils 50cl TABLE 315	\N
1597	indies.cafe	8.158	Simon Pils 50cl TABLE 316	\N
1598	indies.cafe	8.158	Simon Pils 50cl TABLE 317	\N
1599	indies.cafe	8.158	Simon Pils 50cl TABLE 318	\N
1600	indies.cafe	8.158	Simon Pils 50cl TABLE 319	\N
1601	indies.cafe	8.158	Simon Pils 50cl TABLE 320	\N
1602	indies.cafe	8.158	Simon Pils 50cl TABLE 321	\N
1603	indies.cafe	8.158	Simon Pils 50cl TABLE 322	\N
1604	indies.cafe	8.158	Simon Pils 50cl TABLE 323	\N
1605	indies.cafe	8.158	Simon Pils 50cl TABLE 4	\N
1606	indies.cafe	8.158	Simon Pils 50cl TABLE 5	\N
1607	indies.cafe	8.158	Simon Pils 50cl TABLE 6	\N
1608	indies.cafe	8.158	Simon Pils 50cl TABLE 7	\N
1609	indies.cafe	8.158	Simon Pils 50cl TABLE 8	\N
1610	indies.cafe	8.158	Simon Pils 50cl TABLE 9	\N
1611	indies.cafe	13.030	Aperol Spritz standard TABLE 1	\N
1612	indies.cafe	13.030	Aperol Spritz standard TABLE 10	\N
1613	indies.cafe	13.030	Aperol Spritz standard TABLE 11	\N
1614	indies.cafe	13.030	Aperol Spritz standard TABLE 12	\N
1615	indies.cafe	13.030	Aperol Spritz standard TABLE 13	\N
1616	indies.cafe	13.030	Aperol Spritz standard TABLE 14	\N
1617	indies.cafe	13.030	Aperol Spritz standard TABLE 141	\N
1618	indies.cafe	13.030	Aperol Spritz standard TABLE 142	\N
1619	indies.cafe	13.030	Aperol Spritz standard TABLE 15	\N
1620	indies.cafe	13.030	Aperol Spritz standard TABLE 16	\N
1621	indies.cafe	13.030	Aperol Spritz standard TABLE 17	\N
1622	indies.cafe	13.030	Aperol Spritz standard TABLE 18	\N
1623	indies.cafe	13.030	Aperol Spritz standard TABLE 19	\N
1624	indies.cafe	13.030	Aperol Spritz standard TABLE 2	\N
1625	indies.cafe	13.030	Aperol Spritz standard TABLE 20	\N
1626	indies.cafe	13.030	Aperol Spritz standard TABLE 201	\N
1627	indies.cafe	13.030	Aperol Spritz standard TABLE 202	\N
1628	indies.cafe	13.030	Aperol Spritz standard TABLE 203	\N
1629	indies.cafe	13.030	Aperol Spritz standard TABLE 204	\N
1630	indies.cafe	13.030	Aperol Spritz standard TABLE 205	\N
1631	indies.cafe	13.030	Aperol Spritz standard TABLE 206	\N
1632	indies.cafe	13.030	Aperol Spritz standard TABLE 207	\N
1633	indies.cafe	13.030	Aperol Spritz standard TABLE 208	\N
1634	indies.cafe	13.030	Aperol Spritz standard TABLE 209	\N
1635	indies.cafe	13.030	Aperol Spritz standard TABLE 21	\N
1636	indies.cafe	13.030	Aperol Spritz standard TABLE 210	\N
1637	indies.cafe	13.030	Aperol Spritz standard TABLE 211	\N
1638	indies.cafe	13.030	Aperol Spritz standard TABLE 212	\N
1639	indies.cafe	13.030	Aperol Spritz standard TABLE 213	\N
1640	indies.cafe	13.030	Aperol Spritz standard TABLE 214	\N
1641	indies.cafe	13.030	Aperol Spritz standard TABLE 215	\N
1642	indies.cafe	13.030	Aperol Spritz standard TABLE 216	\N
1643	indies.cafe	13.030	Aperol Spritz standard TABLE 217	\N
1644	indies.cafe	13.030	Aperol Spritz standard TABLE 218	\N
1645	indies.cafe	13.030	Aperol Spritz standard TABLE 22	\N
1646	indies.cafe	13.030	Aperol Spritz standard TABLE 23	\N
1647	indies.cafe	13.030	Aperol Spritz standard TABLE 24	\N
1648	indies.cafe	13.030	Aperol Spritz standard TABLE 25	\N
1649	indies.cafe	13.030	Aperol Spritz standard TABLE 26	\N
1650	indies.cafe	13.030	Aperol Spritz standard TABLE 27	\N
1651	indies.cafe	13.030	Aperol Spritz standard TABLE 3	\N
1652	indies.cafe	13.030	Aperol Spritz standard TABLE 301	\N
1653	indies.cafe	13.030	Aperol Spritz standard TABLE 302	\N
1654	indies.cafe	13.030	Aperol Spritz standard TABLE 303	\N
1655	indies.cafe	13.030	Aperol Spritz standard TABLE 304	\N
1656	indies.cafe	13.030	Aperol Spritz standard TABLE 305	\N
1657	indies.cafe	13.030	Aperol Spritz standard TABLE 306	\N
1658	indies.cafe	13.030	Aperol Spritz standard TABLE 307	\N
1659	indies.cafe	13.030	Aperol Spritz standard TABLE 308	\N
1660	indies.cafe	13.030	Aperol Spritz standard TABLE 309	\N
1661	indies.cafe	13.030	Aperol Spritz standard TABLE 310	\N
1662	indies.cafe	13.030	Aperol Spritz standard TABLE 311	\N
1663	indies.cafe	13.030	Aperol Spritz standard TABLE 312	\N
1664	indies.cafe	13.030	Aperol Spritz standard TABLE 313	\N
1665	indies.cafe	13.030	Aperol Spritz standard TABLE 314	\N
1666	indies.cafe	13.030	Aperol Spritz standard TABLE 315	\N
1667	indies.cafe	13.030	Aperol Spritz standard TABLE 316	\N
1668	indies.cafe	13.030	Aperol Spritz standard TABLE 317	\N
1669	indies.cafe	13.030	Aperol Spritz standard TABLE 318	\N
1670	indies.cafe	13.030	Aperol Spritz standard TABLE 319	\N
1671	indies.cafe	13.030	Aperol Spritz standard TABLE 320	\N
1672	indies.cafe	13.030	Aperol Spritz standard TABLE 321	\N
1673	indies.cafe	13.030	Aperol Spritz standard TABLE 322	\N
1674	indies.cafe	13.030	Aperol Spritz standard TABLE 323	\N
1675	indies.cafe	13.030	Aperol Spritz standard TABLE 4	\N
1676	indies.cafe	13.030	Aperol Spritz standard TABLE 5	\N
1677	indies.cafe	13.030	Aperol Spritz standard TABLE 6	\N
1678	indies.cafe	13.030	Aperol Spritz standard TABLE 7	\N
1679	indies.cafe	13.030	Aperol Spritz standard TABLE 8	\N
1680	indies.cafe	13.030	Aperol Spritz standard TABLE 9	\N
1681	indies.cafe	15.296	Hendrick's standard TABLE 1	\N
1682	indies.cafe	15.296	Hendrick's standard TABLE 10	\N
1683	indies.cafe	15.296	Hendrick's standard TABLE 11	\N
1684	indies.cafe	15.296	Hendrick's standard TABLE 12	\N
1685	indies.cafe	15.296	Hendrick's standard TABLE 13	\N
1686	indies.cafe	15.296	Hendrick's standard TABLE 14	\N
1687	indies.cafe	15.296	Hendrick's standard TABLE 141	\N
1688	indies.cafe	15.296	Hendrick's standard TABLE 142	\N
1689	indies.cafe	15.296	Hendrick's standard TABLE 15	\N
1690	indies.cafe	15.296	Hendrick's standard TABLE 16	\N
1691	indies.cafe	15.296	Hendrick's standard TABLE 17	\N
1692	indies.cafe	15.296	Hendrick's standard TABLE 18	\N
1693	indies.cafe	15.296	Hendrick's standard TABLE 19	\N
1694	indies.cafe	15.296	Hendrick's standard TABLE 2	\N
1695	indies.cafe	15.296	Hendrick's standard TABLE 20	\N
1696	indies.cafe	15.296	Hendrick's standard TABLE 201	\N
1697	indies.cafe	15.296	Hendrick's standard TABLE 202	\N
1698	indies.cafe	15.296	Hendrick's standard TABLE 203	\N
1699	indies.cafe	15.296	Hendrick's standard TABLE 204	\N
1700	indies.cafe	15.296	Hendrick's standard TABLE 205	\N
1701	indies.cafe	15.296	Hendrick's standard TABLE 206	\N
1702	indies.cafe	15.296	Hendrick's standard TABLE 207	\N
1703	indies.cafe	15.296	Hendrick's standard TABLE 208	\N
1704	indies.cafe	15.296	Hendrick's standard TABLE 209	\N
1705	indies.cafe	15.296	Hendrick's standard TABLE 21	\N
1706	indies.cafe	15.296	Hendrick's standard TABLE 210	\N
1707	indies.cafe	15.296	Hendrick's standard TABLE 211	\N
1708	indies.cafe	15.296	Hendrick's standard TABLE 212	\N
1709	indies.cafe	15.296	Hendrick's standard TABLE 213	\N
1710	indies.cafe	15.296	Hendrick's standard TABLE 214	\N
1711	indies.cafe	15.296	Hendrick's standard TABLE 215	\N
1712	indies.cafe	15.296	Hendrick's standard TABLE 216	\N
1713	indies.cafe	15.296	Hendrick's standard TABLE 217	\N
1714	indies.cafe	15.296	Hendrick's standard TABLE 218	\N
1715	indies.cafe	15.296	Hendrick's standard TABLE 22	\N
1716	indies.cafe	15.296	Hendrick's standard TABLE 23	\N
1717	indies.cafe	15.296	Hendrick's standard TABLE 24	\N
1718	indies.cafe	15.296	Hendrick's standard TABLE 25	\N
1719	indies.cafe	15.296	Hendrick's standard TABLE 26	\N
1720	indies.cafe	15.296	Hendrick's standard TABLE 27	\N
1721	indies.cafe	15.296	Hendrick's standard TABLE 3	\N
1722	indies.cafe	15.296	Hendrick's standard TABLE 301	\N
1723	indies.cafe	15.296	Hendrick's standard TABLE 302	\N
1724	indies.cafe	15.296	Hendrick's standard TABLE 303	\N
1725	indies.cafe	15.296	Hendrick's standard TABLE 304	\N
1726	indies.cafe	15.296	Hendrick's standard TABLE 305	\N
1727	indies.cafe	15.296	Hendrick's standard TABLE 306	\N
1728	indies.cafe	15.296	Hendrick's standard TABLE 307	\N
1729	indies.cafe	15.296	Hendrick's standard TABLE 308	\N
1730	indies.cafe	15.296	Hendrick's standard TABLE 309	\N
1731	indies.cafe	15.296	Hendrick's standard TABLE 310	\N
1732	indies.cafe	15.296	Hendrick's standard TABLE 311	\N
1733	indies.cafe	15.296	Hendrick's standard TABLE 312	\N
1734	indies.cafe	15.296	Hendrick's standard TABLE 313	\N
1735	indies.cafe	15.296	Hendrick's standard TABLE 314	\N
1736	indies.cafe	15.296	Hendrick's standard TABLE 315	\N
1737	indies.cafe	15.296	Hendrick's standard TABLE 316	\N
1738	indies.cafe	15.296	Hendrick's standard TABLE 317	\N
1739	indies.cafe	15.296	Hendrick's standard TABLE 318	\N
1740	indies.cafe	15.296	Hendrick's standard TABLE 319	\N
1741	indies.cafe	15.296	Hendrick's standard TABLE 320	\N
1742	indies.cafe	15.296	Hendrick's standard TABLE 321	\N
1743	indies.cafe	15.296	Hendrick's standard TABLE 322	\N
1744	indies.cafe	15.296	Hendrick's standard TABLE 323	\N
1745	indies.cafe	15.296	Hendrick's standard TABLE 4	\N
1746	indies.cafe	15.296	Hendrick's standard TABLE 5	\N
1747	indies.cafe	15.296	Hendrick's standard TABLE 6	\N
1748	indies.cafe	15.296	Hendrick's standard TABLE 7	\N
1749	indies.cafe	15.296	Hendrick's standard TABLE 8	\N
1750	indies.cafe	15.296	Hendrick's standard TABLE 9	\N
1751	indies.cafe	8.498	Rosport Blue 1l TABLE 1	\N
1752	indies.cafe	8.498	Rosport Blue 1l TABLE 10	\N
1753	indies.cafe	8.498	Rosport Blue 1l TABLE 11	\N
1754	indies.cafe	8.498	Rosport Blue 1l TABLE 12	\N
1755	indies.cafe	8.498	Rosport Blue 1l TABLE 13	\N
1756	indies.cafe	8.498	Rosport Blue 1l TABLE 14	\N
1757	indies.cafe	8.498	Rosport Blue 1l TABLE 141	\N
1758	indies.cafe	8.498	Rosport Blue 1l TABLE 142	\N
1759	indies.cafe	8.498	Rosport Blue 1l TABLE 15	\N
1760	indies.cafe	8.498	Rosport Blue 1l TABLE 16	\N
1761	indies.cafe	8.498	Rosport Blue 1l TABLE 17	\N
1762	indies.cafe	8.498	Rosport Blue 1l TABLE 18	\N
1763	indies.cafe	8.498	Rosport Blue 1l TABLE 19	\N
1764	indies.cafe	8.498	Rosport Blue 1l TABLE 2	\N
1765	indies.cafe	8.498	Rosport Blue 1l TABLE 20	\N
1766	indies.cafe	8.498	Rosport Blue 1l TABLE 201	\N
1767	indies.cafe	8.498	Rosport Blue 1l TABLE 202	\N
1768	indies.cafe	8.498	Rosport Blue 1l TABLE 203	\N
1769	indies.cafe	8.498	Rosport Blue 1l TABLE 204	\N
1770	indies.cafe	8.498	Rosport Blue 1l TABLE 205	\N
1771	indies.cafe	8.498	Rosport Blue 1l TABLE 206	\N
1772	indies.cafe	8.498	Rosport Blue 1l TABLE 207	\N
1773	indies.cafe	8.498	Rosport Blue 1l TABLE 208	\N
1774	indies.cafe	8.498	Rosport Blue 1l TABLE 209	\N
1775	indies.cafe	8.498	Rosport Blue 1l TABLE 21	\N
1776	indies.cafe	8.498	Rosport Blue 1l TABLE 210	\N
1777	indies.cafe	8.498	Rosport Blue 1l TABLE 211	\N
1778	indies.cafe	8.498	Rosport Blue 1l TABLE 212	\N
1779	indies.cafe	8.498	Rosport Blue 1l TABLE 213	\N
1780	indies.cafe	8.498	Rosport Blue 1l TABLE 214	\N
1781	indies.cafe	8.498	Rosport Blue 1l TABLE 215	\N
1782	indies.cafe	8.498	Rosport Blue 1l TABLE 216	\N
1783	indies.cafe	8.498	Rosport Blue 1l TABLE 217	\N
1784	indies.cafe	8.498	Rosport Blue 1l TABLE 218	\N
1785	indies.cafe	8.498	Rosport Blue 1l TABLE 22	\N
1786	indies.cafe	8.498	Rosport Blue 1l TABLE 23	\N
1787	indies.cafe	8.498	Rosport Blue 1l TABLE 24	\N
1788	indies.cafe	8.498	Rosport Blue 1l TABLE 25	\N
1789	indies.cafe	8.498	Rosport Blue 1l TABLE 26	\N
1790	indies.cafe	8.498	Rosport Blue 1l TABLE 27	\N
1791	indies.cafe	8.498	Rosport Blue 1l TABLE 3	\N
1792	indies.cafe	8.498	Rosport Blue 1l TABLE 301	\N
1793	indies.cafe	8.498	Rosport Blue 1l TABLE 302	\N
1794	indies.cafe	8.498	Rosport Blue 1l TABLE 303	\N
1795	indies.cafe	8.498	Rosport Blue 1l TABLE 304	\N
1796	indies.cafe	8.498	Rosport Blue 1l TABLE 305	\N
1797	indies.cafe	8.498	Rosport Blue 1l TABLE 306	\N
1798	indies.cafe	8.498	Rosport Blue 1l TABLE 307	\N
1799	indies.cafe	8.498	Rosport Blue 1l TABLE 308	\N
1800	indies.cafe	8.498	Rosport Blue 1l TABLE 309	\N
1801	indies.cafe	8.498	Rosport Blue 1l TABLE 310	\N
1802	indies.cafe	8.498	Rosport Blue 1l TABLE 311	\N
1803	indies.cafe	8.498	Rosport Blue 1l TABLE 312	\N
1804	indies.cafe	8.498	Rosport Blue 1l TABLE 313	\N
1805	indies.cafe	8.498	Rosport Blue 1l TABLE 314	\N
1806	indies.cafe	8.498	Rosport Blue 1l TABLE 315	\N
1807	indies.cafe	8.498	Rosport Blue 1l TABLE 316	\N
1808	indies.cafe	8.498	Rosport Blue 1l TABLE 317	\N
1809	indies.cafe	8.498	Rosport Blue 1l TABLE 318	\N
1810	indies.cafe	8.498	Rosport Blue 1l TABLE 319	\N
1811	indies.cafe	8.498	Rosport Blue 1l TABLE 320	\N
1812	indies.cafe	8.498	Rosport Blue 1l TABLE 321	\N
1813	indies.cafe	8.498	Rosport Blue 1l TABLE 322	\N
1814	indies.cafe	8.498	Rosport Blue 1l TABLE 323	\N
1815	indies.cafe	8.498	Rosport Blue 1l TABLE 4	\N
1816	indies.cafe	8.498	Rosport Blue 1l TABLE 5	\N
1817	indies.cafe	8.498	Rosport Blue 1l TABLE 6	\N
1818	indies.cafe	8.498	Rosport Blue 1l TABLE 7	\N
1819	indies.cafe	8.498	Rosport Blue 1l TABLE 8	\N
1820	indies.cafe	8.498	Rosport Blue 1l TABLE 9	\N
1821	indies.cafe	3.399	Rosport Blue 25cl TABLE 1	\N
1822	indies.cafe	3.399	Rosport Blue 25cl TABLE 10	\N
1823	indies.cafe	3.399	Rosport Blue 25cl TABLE 11	\N
1824	indies.cafe	3.399	Rosport Blue 25cl TABLE 12	\N
1825	indies.cafe	3.399	Rosport Blue 25cl TABLE 13	\N
1826	indies.cafe	3.399	Rosport Blue 25cl TABLE 14	\N
1827	indies.cafe	3.399	Rosport Blue 25cl TABLE 141	\N
1828	indies.cafe	3.399	Rosport Blue 25cl TABLE 142	\N
1829	indies.cafe	3.399	Rosport Blue 25cl TABLE 15	\N
1830	indies.cafe	3.399	Rosport Blue 25cl TABLE 16	\N
1831	indies.cafe	3.399	Rosport Blue 25cl TABLE 17	\N
1832	indies.cafe	3.399	Rosport Blue 25cl TABLE 18	\N
1833	indies.cafe	3.399	Rosport Blue 25cl TABLE 19	\N
1834	indies.cafe	3.399	Rosport Blue 25cl TABLE 2	\N
1835	indies.cafe	3.399	Rosport Blue 25cl TABLE 20	\N
1836	indies.cafe	3.399	Rosport Blue 25cl TABLE 201	\N
1837	indies.cafe	3.399	Rosport Blue 25cl TABLE 202	\N
1838	indies.cafe	3.399	Rosport Blue 25cl TABLE 203	\N
1839	indies.cafe	3.399	Rosport Blue 25cl TABLE 204	\N
1840	indies.cafe	3.399	Rosport Blue 25cl TABLE 205	\N
1841	indies.cafe	3.399	Rosport Blue 25cl TABLE 206	\N
1842	indies.cafe	3.399	Rosport Blue 25cl TABLE 207	\N
1843	indies.cafe	3.399	Rosport Blue 25cl TABLE 208	\N
1844	indies.cafe	3.399	Rosport Blue 25cl TABLE 209	\N
1845	indies.cafe	3.399	Rosport Blue 25cl TABLE 21	\N
1846	indies.cafe	3.399	Rosport Blue 25cl TABLE 210	\N
1847	indies.cafe	3.399	Rosport Blue 25cl TABLE 211	\N
1848	indies.cafe	3.399	Rosport Blue 25cl TABLE 212	\N
1849	indies.cafe	3.399	Rosport Blue 25cl TABLE 213	\N
1850	indies.cafe	3.399	Rosport Blue 25cl TABLE 214	\N
1851	indies.cafe	3.399	Rosport Blue 25cl TABLE 215	\N
1852	indies.cafe	3.399	Rosport Blue 25cl TABLE 216	\N
1853	indies.cafe	3.399	Rosport Blue 25cl TABLE 217	\N
1854	indies.cafe	3.399	Rosport Blue 25cl TABLE 218	\N
1855	indies.cafe	3.399	Rosport Blue 25cl TABLE 22	\N
1856	indies.cafe	3.399	Rosport Blue 25cl TABLE 23	\N
1857	indies.cafe	3.399	Rosport Blue 25cl TABLE 24	\N
1858	indies.cafe	3.399	Rosport Blue 25cl TABLE 25	\N
1859	indies.cafe	3.399	Rosport Blue 25cl TABLE 26	\N
1860	indies.cafe	3.399	Rosport Blue 25cl TABLE 27	\N
1861	indies.cafe	3.399	Rosport Blue 25cl TABLE 3	\N
1862	indies.cafe	3.399	Rosport Blue 25cl TABLE 301	\N
1863	indies.cafe	3.399	Rosport Blue 25cl TABLE 302	\N
1864	indies.cafe	3.399	Rosport Blue 25cl TABLE 303	\N
1865	indies.cafe	3.399	Rosport Blue 25cl TABLE 304	\N
1866	indies.cafe	3.399	Rosport Blue 25cl TABLE 305	\N
1867	indies.cafe	3.399	Rosport Blue 25cl TABLE 306	\N
1868	indies.cafe	3.399	Rosport Blue 25cl TABLE 307	\N
1869	indies.cafe	3.399	Rosport Blue 25cl TABLE 308	\N
1870	indies.cafe	3.399	Rosport Blue 25cl TABLE 309	\N
1871	indies.cafe	3.399	Rosport Blue 25cl TABLE 310	\N
1872	indies.cafe	3.399	Rosport Blue 25cl TABLE 311	\N
1873	indies.cafe	3.399	Rosport Blue 25cl TABLE 312	\N
1874	indies.cafe	3.399	Rosport Blue 25cl TABLE 313	\N
1875	indies.cafe	3.399	Rosport Blue 25cl TABLE 314	\N
1876	indies.cafe	3.399	Rosport Blue 25cl TABLE 315	\N
1877	indies.cafe	3.399	Rosport Blue 25cl TABLE 316	\N
1878	indies.cafe	3.399	Rosport Blue 25cl TABLE 317	\N
1879	indies.cafe	3.399	Rosport Blue 25cl TABLE 318	\N
1880	indies.cafe	3.399	Rosport Blue 25cl TABLE 319	\N
1881	indies.cafe	3.399	Rosport Blue 25cl TABLE 320	\N
1882	indies.cafe	3.399	Rosport Blue 25cl TABLE 321	\N
1883	indies.cafe	3.399	Rosport Blue 25cl TABLE 322	\N
1884	indies.cafe	3.399	Rosport Blue 25cl TABLE 323	\N
1885	indies.cafe	3.399	Rosport Blue 25cl TABLE 4	\N
1886	indies.cafe	3.399	Rosport Blue 25cl TABLE 5	\N
1887	indies.cafe	3.399	Rosport Blue 25cl TABLE 6	\N
1888	indies.cafe	3.399	Rosport Blue 25cl TABLE 7	\N
1889	indies.cafe	3.399	Rosport Blue 25cl TABLE 8	\N
1890	indies.cafe	3.399	Rosport Blue 25cl TABLE 9	\N
1891	indies.cafe	5.099	Rosport Blue 50cl TABLE 1	\N
1892	indies.cafe	5.099	Rosport Blue 50cl TABLE 10	\N
1893	indies.cafe	5.099	Rosport Blue 50cl TABLE 11	\N
1894	indies.cafe	5.099	Rosport Blue 50cl TABLE 12	\N
1895	indies.cafe	5.099	Rosport Blue 50cl TABLE 13	\N
1896	indies.cafe	5.099	Rosport Blue 50cl TABLE 14	\N
1897	indies.cafe	5.099	Rosport Blue 50cl TABLE 141	\N
1898	indies.cafe	5.099	Rosport Blue 50cl TABLE 142	\N
1899	indies.cafe	5.099	Rosport Blue 50cl TABLE 15	\N
1900	indies.cafe	5.099	Rosport Blue 50cl TABLE 16	\N
1901	indies.cafe	5.099	Rosport Blue 50cl TABLE 17	\N
1902	indies.cafe	5.099	Rosport Blue 50cl TABLE 18	\N
1903	indies.cafe	5.099	Rosport Blue 50cl TABLE 19	\N
1904	indies.cafe	5.099	Rosport Blue 50cl TABLE 2	\N
1905	indies.cafe	5.099	Rosport Blue 50cl TABLE 20	\N
1906	indies.cafe	5.099	Rosport Blue 50cl TABLE 201	\N
1907	indies.cafe	5.099	Rosport Blue 50cl TABLE 202	\N
1908	indies.cafe	5.099	Rosport Blue 50cl TABLE 203	\N
1909	indies.cafe	5.099	Rosport Blue 50cl TABLE 204	\N
1910	indies.cafe	5.099	Rosport Blue 50cl TABLE 205	\N
1911	indies.cafe	5.099	Rosport Blue 50cl TABLE 206	\N
1912	indies.cafe	5.099	Rosport Blue 50cl TABLE 207	\N
1913	indies.cafe	5.099	Rosport Blue 50cl TABLE 208	\N
1914	indies.cafe	5.099	Rosport Blue 50cl TABLE 209	\N
1915	indies.cafe	5.099	Rosport Blue 50cl TABLE 21	\N
1916	indies.cafe	5.099	Rosport Blue 50cl TABLE 210	\N
1917	indies.cafe	5.099	Rosport Blue 50cl TABLE 211	\N
1918	indies.cafe	5.099	Rosport Blue 50cl TABLE 212	\N
1919	indies.cafe	5.099	Rosport Blue 50cl TABLE 213	\N
1920	indies.cafe	5.099	Rosport Blue 50cl TABLE 214	\N
1921	indies.cafe	5.099	Rosport Blue 50cl TABLE 215	\N
1922	indies.cafe	5.099	Rosport Blue 50cl TABLE 216	\N
1923	indies.cafe	5.099	Rosport Blue 50cl TABLE 217	\N
1924	indies.cafe	5.099	Rosport Blue 50cl TABLE 218	\N
1925	indies.cafe	5.099	Rosport Blue 50cl TABLE 22	\N
1926	indies.cafe	5.099	Rosport Blue 50cl TABLE 23	\N
1927	indies.cafe	5.099	Rosport Blue 50cl TABLE 24	\N
1928	indies.cafe	5.099	Rosport Blue 50cl TABLE 25	\N
1929	indies.cafe	5.099	Rosport Blue 50cl TABLE 26	\N
1930	indies.cafe	5.099	Rosport Blue 50cl TABLE 27	\N
1931	indies.cafe	5.099	Rosport Blue 50cl TABLE 3	\N
1932	indies.cafe	5.099	Rosport Blue 50cl TABLE 301	\N
1933	indies.cafe	5.099	Rosport Blue 50cl TABLE 302	\N
1934	indies.cafe	5.099	Rosport Blue 50cl TABLE 303	\N
1935	indies.cafe	5.099	Rosport Blue 50cl TABLE 304	\N
1936	indies.cafe	5.099	Rosport Blue 50cl TABLE 305	\N
1937	indies.cafe	5.099	Rosport Blue 50cl TABLE 306	\N
1938	indies.cafe	5.099	Rosport Blue 50cl TABLE 307	\N
1939	indies.cafe	5.099	Rosport Blue 50cl TABLE 308	\N
1940	indies.cafe	5.099	Rosport Blue 50cl TABLE 309	\N
1941	indies.cafe	5.099	Rosport Blue 50cl TABLE 310	\N
1942	indies.cafe	5.099	Rosport Blue 50cl TABLE 311	\N
1943	indies.cafe	5.099	Rosport Blue 50cl TABLE 312	\N
1944	indies.cafe	5.099	Rosport Blue 50cl TABLE 313	\N
1945	indies.cafe	5.099	Rosport Blue 50cl TABLE 314	\N
1946	indies.cafe	5.099	Rosport Blue 50cl TABLE 315	\N
1947	indies.cafe	5.099	Rosport Blue 50cl TABLE 316	\N
1948	indies.cafe	5.099	Rosport Blue 50cl TABLE 317	\N
1949	indies.cafe	5.099	Rosport Blue 50cl TABLE 318	\N
1950	indies.cafe	5.099	Rosport Blue 50cl TABLE 319	\N
1951	indies.cafe	5.099	Rosport Blue 50cl TABLE 320	\N
1952	indies.cafe	5.099	Rosport Blue 50cl TABLE 321	\N
1953	indies.cafe	5.099	Rosport Blue 50cl TABLE 322	\N
1954	indies.cafe	5.099	Rosport Blue 50cl TABLE 323	\N
1955	indies.cafe	5.099	Rosport Blue 50cl TABLE 4	\N
1956	indies.cafe	5.099	Rosport Blue 50cl TABLE 5	\N
1957	indies.cafe	5.099	Rosport Blue 50cl TABLE 6	\N
1958	indies.cafe	5.099	Rosport Blue 50cl TABLE 7	\N
1959	indies.cafe	5.099	Rosport Blue 50cl TABLE 8	\N
1960	indies.cafe	5.099	Rosport Blue 50cl TABLE 9	\N
1961	indies.cafe	8.498	Rosport Viva 1l TABLE 1	\N
1962	indies.cafe	8.498	Rosport Viva 1l TABLE 10	\N
1963	indies.cafe	8.498	Rosport Viva 1l TABLE 11	\N
1964	indies.cafe	8.498	Rosport Viva 1l TABLE 12	\N
1965	indies.cafe	8.498	Rosport Viva 1l TABLE 13	\N
1966	indies.cafe	8.498	Rosport Viva 1l TABLE 14	\N
1967	indies.cafe	8.498	Rosport Viva 1l TABLE 141	\N
1968	indies.cafe	8.498	Rosport Viva 1l TABLE 142	\N
1969	indies.cafe	8.498	Rosport Viva 1l TABLE 15	\N
1970	indies.cafe	8.498	Rosport Viva 1l TABLE 16	\N
1971	indies.cafe	8.498	Rosport Viva 1l TABLE 17	\N
1972	indies.cafe	8.498	Rosport Viva 1l TABLE 18	\N
1973	indies.cafe	8.498	Rosport Viva 1l TABLE 19	\N
1974	indies.cafe	8.498	Rosport Viva 1l TABLE 2	\N
1975	indies.cafe	8.498	Rosport Viva 1l TABLE 20	\N
1976	indies.cafe	8.498	Rosport Viva 1l TABLE 201	\N
1977	indies.cafe	8.498	Rosport Viva 1l TABLE 202	\N
1978	indies.cafe	8.498	Rosport Viva 1l TABLE 203	\N
1979	indies.cafe	8.498	Rosport Viva 1l TABLE 204	\N
1980	indies.cafe	8.498	Rosport Viva 1l TABLE 205	\N
1981	indies.cafe	8.498	Rosport Viva 1l TABLE 206	\N
1982	indies.cafe	8.498	Rosport Viva 1l TABLE 207	\N
1983	indies.cafe	8.498	Rosport Viva 1l TABLE 208	\N
1984	indies.cafe	8.498	Rosport Viva 1l TABLE 209	\N
1985	indies.cafe	8.498	Rosport Viva 1l TABLE 21	\N
1986	indies.cafe	8.498	Rosport Viva 1l TABLE 210	\N
1987	indies.cafe	8.498	Rosport Viva 1l TABLE 211	\N
1988	indies.cafe	8.498	Rosport Viva 1l TABLE 212	\N
1989	indies.cafe	8.498	Rosport Viva 1l TABLE 213	\N
1990	indies.cafe	8.498	Rosport Viva 1l TABLE 214	\N
1991	indies.cafe	8.498	Rosport Viva 1l TABLE 215	\N
1992	indies.cafe	8.498	Rosport Viva 1l TABLE 216	\N
1993	indies.cafe	8.498	Rosport Viva 1l TABLE 217	\N
1994	indies.cafe	8.498	Rosport Viva 1l TABLE 218	\N
1995	indies.cafe	8.498	Rosport Viva 1l TABLE 22	\N
1996	indies.cafe	8.498	Rosport Viva 1l TABLE 23	\N
1997	indies.cafe	8.498	Rosport Viva 1l TABLE 24	\N
1998	indies.cafe	8.498	Rosport Viva 1l TABLE 25	\N
1999	indies.cafe	8.498	Rosport Viva 1l TABLE 26	\N
2000	indies.cafe	8.498	Rosport Viva 1l TABLE 27	\N
2001	indies.cafe	8.498	Rosport Viva 1l TABLE 3	\N
2002	indies.cafe	8.498	Rosport Viva 1l TABLE 301	\N
2003	indies.cafe	8.498	Rosport Viva 1l TABLE 302	\N
2004	indies.cafe	8.498	Rosport Viva 1l TABLE 303	\N
2005	indies.cafe	8.498	Rosport Viva 1l TABLE 304	\N
2006	indies.cafe	8.498	Rosport Viva 1l TABLE 305	\N
2007	indies.cafe	8.498	Rosport Viva 1l TABLE 306	\N
2008	indies.cafe	8.498	Rosport Viva 1l TABLE 307	\N
2009	indies.cafe	8.498	Rosport Viva 1l TABLE 308	\N
2010	indies.cafe	8.498	Rosport Viva 1l TABLE 309	\N
2011	indies.cafe	8.498	Rosport Viva 1l TABLE 310	\N
2012	indies.cafe	8.498	Rosport Viva 1l TABLE 311	\N
2013	indies.cafe	8.498	Rosport Viva 1l TABLE 312	\N
2014	indies.cafe	8.498	Rosport Viva 1l TABLE 313	\N
2015	indies.cafe	8.498	Rosport Viva 1l TABLE 314	\N
2016	indies.cafe	8.498	Rosport Viva 1l TABLE 315	\N
2017	indies.cafe	8.498	Rosport Viva 1l TABLE 316	\N
2018	indies.cafe	8.498	Rosport Viva 1l TABLE 317	\N
2019	indies.cafe	8.498	Rosport Viva 1l TABLE 318	\N
2020	indies.cafe	8.498	Rosport Viva 1l TABLE 319	\N
2021	indies.cafe	8.498	Rosport Viva 1l TABLE 320	\N
2022	indies.cafe	8.498	Rosport Viva 1l TABLE 321	\N
2023	indies.cafe	8.498	Rosport Viva 1l TABLE 322	\N
2024	indies.cafe	8.498	Rosport Viva 1l TABLE 323	\N
2025	indies.cafe	8.498	Rosport Viva 1l TABLE 4	\N
2026	indies.cafe	8.498	Rosport Viva 1l TABLE 5	\N
2027	indies.cafe	8.498	Rosport Viva 1l TABLE 6	\N
2028	indies.cafe	8.498	Rosport Viva 1l TABLE 7	\N
2029	indies.cafe	8.498	Rosport Viva 1l TABLE 8	\N
2030	indies.cafe	8.498	Rosport Viva 1l TABLE 9	\N
2031	indies.cafe	3.399	Rosport Viva 25cl TABLE 1	\N
2032	indies.cafe	3.399	Rosport Viva 25cl TABLE 10	\N
2033	indies.cafe	3.399	Rosport Viva 25cl TABLE 11	\N
2034	indies.cafe	3.399	Rosport Viva 25cl TABLE 12	\N
2035	indies.cafe	3.399	Rosport Viva 25cl TABLE 13	\N
2036	indies.cafe	3.399	Rosport Viva 25cl TABLE 14	\N
2037	indies.cafe	3.399	Rosport Viva 25cl TABLE 141	\N
2038	indies.cafe	3.399	Rosport Viva 25cl TABLE 142	\N
2039	indies.cafe	3.399	Rosport Viva 25cl TABLE 15	\N
2040	indies.cafe	3.399	Rosport Viva 25cl TABLE 16	\N
2041	indies.cafe	3.399	Rosport Viva 25cl TABLE 17	\N
2042	indies.cafe	3.399	Rosport Viva 25cl TABLE 18	\N
2043	indies.cafe	3.399	Rosport Viva 25cl TABLE 19	\N
2044	indies.cafe	3.399	Rosport Viva 25cl TABLE 2	\N
2045	indies.cafe	3.399	Rosport Viva 25cl TABLE 20	\N
2046	indies.cafe	3.399	Rosport Viva 25cl TABLE 201	\N
2047	indies.cafe	3.399	Rosport Viva 25cl TABLE 202	\N
2048	indies.cafe	3.399	Rosport Viva 25cl TABLE 203	\N
2049	indies.cafe	3.399	Rosport Viva 25cl TABLE 204	\N
2050	indies.cafe	3.399	Rosport Viva 25cl TABLE 205	\N
2051	indies.cafe	3.399	Rosport Viva 25cl TABLE 206	\N
2052	indies.cafe	3.399	Rosport Viva 25cl TABLE 207	\N
2053	indies.cafe	3.399	Rosport Viva 25cl TABLE 208	\N
2054	indies.cafe	3.399	Rosport Viva 25cl TABLE 209	\N
2055	indies.cafe	3.399	Rosport Viva 25cl TABLE 21	\N
2056	indies.cafe	3.399	Rosport Viva 25cl TABLE 210	\N
2057	indies.cafe	3.399	Rosport Viva 25cl TABLE 211	\N
2058	indies.cafe	3.399	Rosport Viva 25cl TABLE 212	\N
2059	indies.cafe	3.399	Rosport Viva 25cl TABLE 213	\N
2060	indies.cafe	3.399	Rosport Viva 25cl TABLE 214	\N
2061	indies.cafe	3.399	Rosport Viva 25cl TABLE 215	\N
2062	indies.cafe	3.399	Rosport Viva 25cl TABLE 216	\N
2063	indies.cafe	3.399	Rosport Viva 25cl TABLE 217	\N
2064	indies.cafe	3.399	Rosport Viva 25cl TABLE 218	\N
2065	indies.cafe	3.399	Rosport Viva 25cl TABLE 22	\N
2066	indies.cafe	3.399	Rosport Viva 25cl TABLE 23	\N
2067	indies.cafe	3.399	Rosport Viva 25cl TABLE 24	\N
2068	indies.cafe	3.399	Rosport Viva 25cl TABLE 25	\N
2069	indies.cafe	3.399	Rosport Viva 25cl TABLE 26	\N
2070	indies.cafe	3.399	Rosport Viva 25cl TABLE 27	\N
2071	indies.cafe	3.399	Rosport Viva 25cl TABLE 3	\N
2072	indies.cafe	3.399	Rosport Viva 25cl TABLE 301	\N
2073	indies.cafe	3.399	Rosport Viva 25cl TABLE 302	\N
2074	indies.cafe	3.399	Rosport Viva 25cl TABLE 303	\N
2075	indies.cafe	3.399	Rosport Viva 25cl TABLE 304	\N
2076	indies.cafe	3.399	Rosport Viva 25cl TABLE 305	\N
2077	indies.cafe	3.399	Rosport Viva 25cl TABLE 306	\N
2078	indies.cafe	3.399	Rosport Viva 25cl TABLE 307	\N
2079	indies.cafe	3.399	Rosport Viva 25cl TABLE 308	\N
2080	indies.cafe	3.399	Rosport Viva 25cl TABLE 309	\N
2081	indies.cafe	3.399	Rosport Viva 25cl TABLE 310	\N
2082	indies.cafe	3.399	Rosport Viva 25cl TABLE 311	\N
2083	indies.cafe	3.399	Rosport Viva 25cl TABLE 312	\N
2084	indies.cafe	3.399	Rosport Viva 25cl TABLE 313	\N
2085	indies.cafe	3.399	Rosport Viva 25cl TABLE 314	\N
2086	indies.cafe	3.399	Rosport Viva 25cl TABLE 315	\N
2087	indies.cafe	3.399	Rosport Viva 25cl TABLE 316	\N
2088	indies.cafe	3.399	Rosport Viva 25cl TABLE 317	\N
2089	indies.cafe	3.399	Rosport Viva 25cl TABLE 318	\N
2090	indies.cafe	3.399	Rosport Viva 25cl TABLE 319	\N
2091	indies.cafe	3.399	Rosport Viva 25cl TABLE 320	\N
2092	indies.cafe	3.399	Rosport Viva 25cl TABLE 321	\N
2093	indies.cafe	3.399	Rosport Viva 25cl TABLE 322	\N
2094	indies.cafe	3.399	Rosport Viva 25cl TABLE 323	\N
2095	indies.cafe	3.399	Rosport Viva 25cl TABLE 4	\N
2096	indies.cafe	3.399	Rosport Viva 25cl TABLE 5	\N
2097	indies.cafe	3.399	Rosport Viva 25cl TABLE 6	\N
2098	indies.cafe	3.399	Rosport Viva 25cl TABLE 7	\N
2099	indies.cafe	3.399	Rosport Viva 25cl TABLE 8	\N
2100	indies.cafe	3.399	Rosport Viva 25cl TABLE 9	\N
2101	indies.cafe	5.099	Rosport Viva 50cl TABLE 1	\N
2102	indies.cafe	5.099	Rosport Viva 50cl TABLE 10	\N
2103	indies.cafe	5.099	Rosport Viva 50cl TABLE 11	\N
2104	indies.cafe	5.099	Rosport Viva 50cl TABLE 12	\N
2105	indies.cafe	5.099	Rosport Viva 50cl TABLE 13	\N
2106	indies.cafe	5.099	Rosport Viva 50cl TABLE 14	\N
2107	indies.cafe	5.099	Rosport Viva 50cl TABLE 141	\N
2108	indies.cafe	5.099	Rosport Viva 50cl TABLE 142	\N
2109	indies.cafe	5.099	Rosport Viva 50cl TABLE 15	\N
2110	indies.cafe	5.099	Rosport Viva 50cl TABLE 16	\N
2111	indies.cafe	5.099	Rosport Viva 50cl TABLE 17	\N
2112	indies.cafe	5.099	Rosport Viva 50cl TABLE 18	\N
2113	indies.cafe	5.099	Rosport Viva 50cl TABLE 19	\N
2114	indies.cafe	5.099	Rosport Viva 50cl TABLE 2	\N
2115	indies.cafe	5.099	Rosport Viva 50cl TABLE 20	\N
2116	indies.cafe	5.099	Rosport Viva 50cl TABLE 201	\N
2117	indies.cafe	5.099	Rosport Viva 50cl TABLE 202	\N
2118	indies.cafe	5.099	Rosport Viva 50cl TABLE 203	\N
2119	indies.cafe	5.099	Rosport Viva 50cl TABLE 204	\N
2120	indies.cafe	5.099	Rosport Viva 50cl TABLE 205	\N
2121	indies.cafe	5.099	Rosport Viva 50cl TABLE 206	\N
2122	indies.cafe	5.099	Rosport Viva 50cl TABLE 207	\N
2123	indies.cafe	5.099	Rosport Viva 50cl TABLE 208	\N
2124	indies.cafe	5.099	Rosport Viva 50cl TABLE 209	\N
2125	indies.cafe	5.099	Rosport Viva 50cl TABLE 21	\N
2126	indies.cafe	5.099	Rosport Viva 50cl TABLE 210	\N
2127	indies.cafe	5.099	Rosport Viva 50cl TABLE 211	\N
2128	indies.cafe	5.099	Rosport Viva 50cl TABLE 212	\N
2129	indies.cafe	5.099	Rosport Viva 50cl TABLE 213	\N
2130	indies.cafe	5.099	Rosport Viva 50cl TABLE 214	\N
2131	indies.cafe	5.099	Rosport Viva 50cl TABLE 215	\N
2132	indies.cafe	5.099	Rosport Viva 50cl TABLE 216	\N
2133	indies.cafe	5.099	Rosport Viva 50cl TABLE 217	\N
2134	indies.cafe	5.099	Rosport Viva 50cl TABLE 218	\N
2135	indies.cafe	5.099	Rosport Viva 50cl TABLE 22	\N
2136	indies.cafe	5.099	Rosport Viva 50cl TABLE 23	\N
2137	indies.cafe	5.099	Rosport Viva 50cl TABLE 24	\N
2138	indies.cafe	5.099	Rosport Viva 50cl TABLE 25	\N
2139	indies.cafe	5.099	Rosport Viva 50cl TABLE 26	\N
2140	indies.cafe	5.099	Rosport Viva 50cl TABLE 27	\N
2141	indies.cafe	5.099	Rosport Viva 50cl TABLE 3	\N
2142	indies.cafe	5.099	Rosport Viva 50cl TABLE 301	\N
2143	indies.cafe	5.099	Rosport Viva 50cl TABLE 302	\N
2144	indies.cafe	5.099	Rosport Viva 50cl TABLE 303	\N
2145	indies.cafe	5.099	Rosport Viva 50cl TABLE 304	\N
2146	indies.cafe	5.099	Rosport Viva 50cl TABLE 305	\N
2147	indies.cafe	5.099	Rosport Viva 50cl TABLE 306	\N
2148	indies.cafe	5.099	Rosport Viva 50cl TABLE 307	\N
2149	indies.cafe	5.099	Rosport Viva 50cl TABLE 308	\N
2150	indies.cafe	5.099	Rosport Viva 50cl TABLE 309	\N
2151	indies.cafe	5.099	Rosport Viva 50cl TABLE 310	\N
2152	indies.cafe	5.099	Rosport Viva 50cl TABLE 311	\N
2153	indies.cafe	5.099	Rosport Viva 50cl TABLE 312	\N
2154	indies.cafe	5.099	Rosport Viva 50cl TABLE 313	\N
2155	indies.cafe	5.099	Rosport Viva 50cl TABLE 314	\N
2156	indies.cafe	5.099	Rosport Viva 50cl TABLE 315	\N
2157	indies.cafe	5.099	Rosport Viva 50cl TABLE 316	\N
2158	indies.cafe	5.099	Rosport Viva 50cl TABLE 317	\N
2159	indies.cafe	5.099	Rosport Viva 50cl TABLE 318	\N
2160	indies.cafe	5.099	Rosport Viva 50cl TABLE 319	\N
2161	indies.cafe	5.099	Rosport Viva 50cl TABLE 320	\N
2162	indies.cafe	5.099	Rosport Viva 50cl TABLE 321	\N
2163	indies.cafe	5.099	Rosport Viva 50cl TABLE 322	\N
2164	indies.cafe	5.099	Rosport Viva 50cl TABLE 323	\N
2165	indies.cafe	5.099	Rosport Viva 50cl TABLE 4	\N
2166	indies.cafe	5.099	Rosport Viva 50cl TABLE 5	\N
2167	indies.cafe	5.099	Rosport Viva 50cl TABLE 6	\N
2168	indies.cafe	5.099	Rosport Viva 50cl TABLE 7	\N
2169	indies.cafe	5.099	Rosport Viva 50cl TABLE 8	\N
2170	indies.cafe	5.099	Rosport Viva 50cl TABLE 9	\N
\.


--
-- Data for Name: restaurant_tables; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.restaurant_tables (table_number, location) FROM stdin;
TABLE 1	local principal
TABLE 2	local principal
TABLE 3	local principal
TABLE 4	local principal
TABLE 5	local principal
TABLE 6	local principal
TABLE 7	local principal
TABLE 8	local principal
TABLE 9	local principal
TABLE 10	local principal
TABLE 11	local principal
TABLE 12	local principal
TABLE 13	local principal
TABLE 14	local principal
TABLE 15	local principal
TABLE 16	local principal
TABLE 17	local principal
TABLE 18	local principal
TABLE 19	local principal
TABLE 20	local principal
TABLE 21	local principal
TABLE 22	local principal
TABLE 23	local principal
TABLE 24	local principal
TABLE 25	local principal
TABLE 26	local principal
TABLE 27	local principal
TABLE 141	local principal
TABLE 142	local principal
TABLE 201	terrasse
TABLE 202	terrasse
TABLE 203	terrasse
TABLE 204	terrasse
TABLE 205	terrasse
TABLE 206	terrasse
TABLE 207	terrasse
TABLE 208	terrasse
TABLE 209	terrasse
TABLE 210	terrasse
TABLE 211	terrasse
TABLE 212	terrasse
TABLE 213	terrasse
TABLE 214	terrasse
TABLE 215	terrasse
TABLE 216	terrasse
TABLE 217	terrasse
TABLE 218	terrasse
TABLE 301	etage
TABLE 302	etage
TABLE 303	etage
TABLE 304	etage
TABLE 305	etage
TABLE 306	etage
TABLE 307	etage
TABLE 308	etage
TABLE 309	etage
TABLE 310	etage
TABLE 311	etage
TABLE 312	etage
TABLE 313	etage
TABLE 314	etage
TABLE 315	etage
TABLE 316	etage
TABLE 317	etage
TABLE 318	etage
TABLE 319	etage
TABLE 320	etage
TABLE 321	etage
TABLE 322	etage
TABLE 323	etage
\.


--
-- Data for Name: transfers; Type: TABLE DATA; Schema: public; Owner: Sorin
--

COPY public.transfers (id, from_account, amount, symbol, memo, parsed_memo, fulfilled, received_at, fulfilled_at) FROM stdin;
371411858176873474	sorin.cristescu	1.000	HBD	kcs-dXaz-HxYe-4HhC 	kcs-dXaz-HxYe-4HhC 	t	2025-06-28 18:02:53.793018+02	\N
371081991803639554	sorin.cristescu	1.070	HBD	v4v-ySDJW	v4v-ySDJW	t	2025-06-28 18:02:53.793018+02	\N
371461426394435586	sorin.cristescu	1.071	HBD	Test v4v-ePbTX	Test v4v-ePbTX	t	2025-06-28 18:02:53.793018+02	\N
373650085893903362	sorin.lite	1.083	HBD	Test ecency.com  v4v-tUhxo	Test ecency.com  v4v-tUhxo	t	2025-06-28 18:02:53.793018+02	\N
377713331114345986	sorin.cristescu	3.060	HBD	Test v4v-k5oHm	Test v4v-k5oHm	t	2025-06-28 18:02:53.793018+02	\N
371458956788240386	sorin.cristescu	4.175	HBD	Small Simon  v4v-3vWBP	Small Simon  v4v-3vWBP	t	2025-06-28 18:02:53.793018+02	\N
371461611078027010	sorin.cristescu	4.179	HBD	Small bier Table 205 v4v-s3CSL	Small bier Table 205 v4v-s3CSL	t	2025-06-28 18:02:53.793018+02	\N
372219599791325954	sorin.cristescu	1.000	HBD	kcs-LXXZ-fhIX-xfVk 	kcs-LXXZ-fhIX-xfVk 	t	2025-06-28 18:02:53.793018+02	\N
373649944160003586	sorin.lite	0.500	HBD	no qr code	no qr code	t	2025-06-28 18:02:53.793018+02	\N
387584939782048770	sorin.offchain	11.774	HBD	kcs-91Sk-uqJQ-77Wv Testounet	kcs-91Sk-uqJQ-77Wv Testounet	t	2025-06-28 18:02:53.793018+02	\N
417031192613749506	decent-tester	1.806	HBD	Simon Pils TABLE 5 v4v-1fw7L	Simon Pils TABLE 5 v4v-1fw7L	f	2025-06-28 18:12:05.104+02	\N
413561030837287938	sorin.offchain	1.129	HBD	Test dev v4v-aOAF2	Test dev v4v-aOAF2	t	2025-06-28 18:02:53.793018+02	2025-06-28 19:50:04.297+02
416800402546103554	sorin.cristescu	4.419	HBD	Simon Binz 15cl TABLE 11	Simon Binz 15cl TABLE 11	t	2025-06-28 18:12:05.154+02	2025-06-28 19:50:19.073+02
416805273039012866	sorin.lite	2.000	HBD	with TABLE info now, but no number	with TABLE info now, but no number	t	2025-06-28 18:12:05.146+02	2025-06-28 19:50:21.903+02
416807295968615682	sorin.offchain	3.000	HBD	something for TABLE 42	something for TABLE 42	t	2025-06-28 18:12:05.129+02	2025-06-28 19:50:23.718+02
416978222782090754	sorin.offchain	1.276	HBD	Test prisma Vercel TABLE 25 v4v-qk2Jo	Test prisma Vercel TABLE 25 v4v-qk2Jo	t	2025-06-28 18:12:05.12+02	2025-06-28 19:50:27.705+02
\.


--
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Sorin
--

SELECT pg_catalog.setval('public.categories_category_id_seq', 32, false);


--
-- Name: cuisson_cuisson_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Sorin
--

SELECT pg_catalog.setval('public.cuisson_cuisson_id_seq', 5, true);


--
-- Name: dishes_dish_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Sorin
--

SELECT pg_catalog.setval('public.dishes_dish_id_seq', 19, true);


--
-- Name: drinks_drink_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Sorin
--

SELECT pg_catalog.setval('public.drinks_drink_id_seq', 164, false);


--
-- Name: ingredients_ingredient_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Sorin
--

SELECT pg_catalog.setval('public.ingredients_ingredient_id_seq', 75, false);


--
-- Name: orders_order_id_seq; Type: SEQUENCE SET; Schema: public; Owner: Sorin
--

SELECT pg_catalog.setval('public.orders_order_id_seq', 2170, true);


--
-- PostgreSQL database dump complete
--

