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
-- Name: public; Type: SCHEMA; Schema: -; Owner: Sorin
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO "Sorin";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO "Sorin";

--
-- Name: categories; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(10),
    CONSTRAINT categories_type_check CHECK (((type)::text = ANY ((ARRAY['dish'::character varying, 'drink'::character varying])::text[])))
);


ALTER TABLE public.categories OWNER TO "Sorin";

--
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: Sorin
--

CREATE SEQUENCE public.categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_category_id_seq OWNER TO "Sorin";

--
-- Name: categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Sorin
--

ALTER SEQUENCE public.categories_category_id_seq OWNED BY public.categories.category_id;


--
-- Name: categories_dishes; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.categories_dishes (
    category_id integer NOT NULL,
    dish_id integer NOT NULL
);


ALTER TABLE public.categories_dishes OWNER TO "Sorin";

--
-- Name: categories_drinks; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.categories_drinks (
    category_id integer NOT NULL,
    drink_id integer NOT NULL
);


ALTER TABLE public.categories_drinks OWNER TO "Sorin";

--
-- Name: cuisson; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.cuisson (
    cuisson_id integer NOT NULL,
    english_name character varying(50) NOT NULL,
    french_name character varying(50) NOT NULL
);


ALTER TABLE public.cuisson OWNER TO "Sorin";

--
-- Name: cuisson_cuisson_id_seq; Type: SEQUENCE; Schema: public; Owner: Sorin
--

CREATE SEQUENCE public.cuisson_cuisson_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.cuisson_cuisson_id_seq OWNER TO "Sorin";

--
-- Name: cuisson_cuisson_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Sorin
--

ALTER SEQUENCE public.cuisson_cuisson_id_seq OWNED BY public.cuisson.cuisson_id;


--
-- Name: currency_conversion; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.currency_conversion (
    date date NOT NULL,
    conversion_rate numeric(10,4) NOT NULL
);


ALTER TABLE public.currency_conversion OWNER TO "Sorin";

--
-- Name: dishes; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.dishes (
    dish_id integer NOT NULL,
    name character varying(200) NOT NULL,
    price_eur numeric(10,2) NOT NULL,
    record_date date DEFAULT '2025-05-29'::date NOT NULL,
    image character varying(255)
);


ALTER TABLE public.dishes OWNER TO "Sorin";

--
-- Name: dishes_cuisson; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.dishes_cuisson (
    dish_id integer NOT NULL,
    cuisson_id integer NOT NULL
);


ALTER TABLE public.dishes_cuisson OWNER TO "Sorin";

--
-- Name: dishes_dish_id_seq; Type: SEQUENCE; Schema: public; Owner: Sorin
--

CREATE SEQUENCE public.dishes_dish_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dishes_dish_id_seq OWNER TO "Sorin";

--
-- Name: dishes_dish_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Sorin
--

ALTER SEQUENCE public.dishes_dish_id_seq OWNED BY public.dishes.dish_id;


--
-- Name: dishes_ingredients; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.dishes_ingredients (
    dish_id integer NOT NULL,
    ingredient_id integer NOT NULL
);


ALTER TABLE public.dishes_ingredients OWNER TO "Sorin";

--
-- Name: drink_sizes; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.drink_sizes (
    drink_id integer NOT NULL,
    size character varying(50) NOT NULL,
    price_eur numeric(10,2) NOT NULL,
    record_date date DEFAULT '2025-06-01'::date NOT NULL
);


ALTER TABLE public.drink_sizes OWNER TO "Sorin";

--
-- Name: drinks; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.drinks (
    drink_id integer NOT NULL,
    name character varying(200) NOT NULL,
    record_date date DEFAULT '2025-06-01'::date NOT NULL,
    image character varying(255)
);


ALTER TABLE public.drinks OWNER TO "Sorin";

--
-- Name: drinks_drink_id_seq; Type: SEQUENCE; Schema: public; Owner: Sorin
--

CREATE SEQUENCE public.drinks_drink_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drinks_drink_id_seq OWNER TO "Sorin";

--
-- Name: drinks_drink_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Sorin
--

ALTER SEQUENCE public.drinks_drink_id_seq OWNED BY public.drinks.drink_id;


--
-- Name: drinks_ingredients; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.drinks_ingredients (
    drink_id integer NOT NULL,
    ingredient_id integer NOT NULL
);


ALTER TABLE public.drinks_ingredients OWNER TO "Sorin";

--
-- Name: ingredients; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.ingredients (
    ingredient_id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.ingredients OWNER TO "Sorin";

--
-- Name: ingredients_ingredient_id_seq; Type: SEQUENCE; Schema: public; Owner: Sorin
--

CREATE SEQUENCE public.ingredients_ingredient_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ingredients_ingredient_id_seq OWNER TO "Sorin";

--
-- Name: ingredients_ingredient_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Sorin
--

ALTER SEQUENCE public.ingredients_ingredient_id_seq OWNED BY public.ingredients.ingredient_id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.orders (
    order_id integer NOT NULL,
    recipient character varying(50) DEFAULT 'indies.cafe'::character varying NOT NULL,
    amount_hbd numeric(10,3) NOT NULL,
    memo character varying(255) NOT NULL,
    hive_uri character varying(255)
);


ALTER TABLE public.orders OWNER TO "Sorin";

--
-- Name: orders_order_id_seq; Type: SEQUENCE; Schema: public; Owner: Sorin
--

CREATE SEQUENCE public.orders_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_order_id_seq OWNER TO "Sorin";

--
-- Name: orders_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: Sorin
--

ALTER SEQUENCE public.orders_order_id_seq OWNED BY public.orders.order_id;


--
-- Name: restaurant_tables; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.restaurant_tables (
    table_number character varying(10) NOT NULL,
    location character varying(50) NOT NULL
);


ALTER TABLE public.restaurant_tables OWNER TO "Sorin";

--
-- Name: transfers; Type: TABLE; Schema: public; Owner: Sorin
--

CREATE TABLE public.transfers (
    id bigint NOT NULL,
    from_account text NOT NULL,
    amount text NOT NULL,
    symbol text NOT NULL,
    memo text,
    parsed_memo text,
    fulfilled boolean DEFAULT false,
    received_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fulfilled_at timestamp with time zone
);


ALTER TABLE public.transfers OWNER TO "Sorin";

--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);


--
-- Name: cuisson cuisson_id; Type: DEFAULT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.cuisson ALTER COLUMN cuisson_id SET DEFAULT nextval('public.cuisson_cuisson_id_seq'::regclass);


--
-- Name: dishes dish_id; Type: DEFAULT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes ALTER COLUMN dish_id SET DEFAULT nextval('public.dishes_dish_id_seq'::regclass);


--
-- Name: drinks drink_id; Type: DEFAULT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.drinks ALTER COLUMN drink_id SET DEFAULT nextval('public.drinks_drink_id_seq'::regclass);


--
-- Name: ingredients ingredient_id; Type: DEFAULT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.ingredients ALTER COLUMN ingredient_id SET DEFAULT nextval('public.ingredients_ingredient_id_seq'::regclass);


--
-- Name: orders order_id; Type: DEFAULT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.orders ALTER COLUMN order_id SET DEFAULT nextval('public.orders_order_id_seq'::regclass);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: categories_dishes categories_dishes_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories_dishes
    ADD CONSTRAINT categories_dishes_pkey PRIMARY KEY (category_id, dish_id);


--
-- Name: categories_drinks categories_drinks_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories_drinks
    ADD CONSTRAINT categories_drinks_pkey PRIMARY KEY (category_id, drink_id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: cuisson cuisson_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.cuisson
    ADD CONSTRAINT cuisson_pkey PRIMARY KEY (cuisson_id);


--
-- Name: currency_conversion currency_conversion_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.currency_conversion
    ADD CONSTRAINT currency_conversion_pkey PRIMARY KEY (date);


--
-- Name: dishes_cuisson dishes_cuisson_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes_cuisson
    ADD CONSTRAINT dishes_cuisson_pkey PRIMARY KEY (dish_id, cuisson_id);


--
-- Name: dishes_ingredients dishes_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes_ingredients
    ADD CONSTRAINT dishes_ingredients_pkey PRIMARY KEY (dish_id, ingredient_id);


--
-- Name: dishes dishes_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes
    ADD CONSTRAINT dishes_pkey PRIMARY KEY (dish_id);


--
-- Name: drink_sizes drink_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.drink_sizes
    ADD CONSTRAINT drink_sizes_pkey PRIMARY KEY (drink_id, size);


--
-- Name: drinks_ingredients drinks_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.drinks_ingredients
    ADD CONSTRAINT drinks_ingredients_pkey PRIMARY KEY (drink_id, ingredient_id);


--
-- Name: drinks drinks_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.drinks
    ADD CONSTRAINT drinks_pkey PRIMARY KEY (drink_id);


--
-- Name: ingredients ingredients_name_key; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_name_key UNIQUE (name);


--
-- Name: ingredients ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.ingredients
    ADD CONSTRAINT ingredients_pkey PRIMARY KEY (ingredient_id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (order_id);


--
-- Name: restaurant_tables restaurant_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.restaurant_tables
    ADD CONSTRAINT restaurant_tables_pkey PRIMARY KEY (table_number);


--
-- Name: transfers transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.transfers
    ADD CONSTRAINT transfers_pkey PRIMARY KEY (id);


--
-- Name: categories_name_key; Type: INDEX; Schema: public; Owner: Sorin
--

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);


--
-- Name: drinks_name_key; Type: INDEX; Schema: public; Owner: Sorin
--

CREATE UNIQUE INDEX drinks_name_key ON public.drinks USING btree (name);


--
-- Name: categories_dishes categories_dishes_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories_dishes
    ADD CONSTRAINT categories_dishes_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: categories_dishes categories_dishes_dish_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories_dishes
    ADD CONSTRAINT categories_dishes_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(dish_id);


--
-- Name: categories_drinks categories_drinks_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories_drinks
    ADD CONSTRAINT categories_drinks_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: categories_drinks categories_drinks_drink_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.categories_drinks
    ADD CONSTRAINT categories_drinks_drink_id_fkey FOREIGN KEY (drink_id) REFERENCES public.drinks(drink_id);


--
-- Name: dishes_cuisson dishes_cuisson_cuisson_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes_cuisson
    ADD CONSTRAINT dishes_cuisson_cuisson_id_fkey FOREIGN KEY (cuisson_id) REFERENCES public.cuisson(cuisson_id);


--
-- Name: dishes_cuisson dishes_cuisson_dish_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes_cuisson
    ADD CONSTRAINT dishes_cuisson_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(dish_id);


--
-- Name: dishes_ingredients dishes_ingredients_dish_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes_ingredients
    ADD CONSTRAINT dishes_ingredients_dish_id_fkey FOREIGN KEY (dish_id) REFERENCES public.dishes(dish_id);


--
-- Name: dishes_ingredients dishes_ingredients_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.dishes_ingredients
    ADD CONSTRAINT dishes_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(ingredient_id);


--
-- Name: drink_sizes drink_sizes_drink_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.drink_sizes
    ADD CONSTRAINT drink_sizes_drink_id_fkey FOREIGN KEY (drink_id) REFERENCES public.drinks(drink_id);


--
-- Name: drinks_ingredients drinks_ingredients_drink_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.drinks_ingredients
    ADD CONSTRAINT drinks_ingredients_drink_id_fkey FOREIGN KEY (drink_id) REFERENCES public.drinks(drink_id);


--
-- Name: drinks_ingredients drinks_ingredients_ingredient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: Sorin
--

ALTER TABLE ONLY public.drinks_ingredients
    ADD CONSTRAINT drinks_ingredients_ingredient_id_fkey FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(ingredient_id);


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO "Sorin";


--
-- PostgreSQL database dump complete
--

