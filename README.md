# EKO-KOM Evidence - Nasazeni na Vercel

## Co potrebujete

- GitHub ucet (zdarma) - github.com
- Supabase ucet (zdarma) - supabase.com
- Vercel ucet (zdarma) - vercel.com

---

## Krok 1: Supabase (databaze)

1. Jdete na **supabase.com** a vytvorte ucet
2. Kliknete **New Project**, zadejte nazev (napr. `ekokom`) a heslo k DB
3. Pockejte az se projekt vytvori (~1 min)
4. V menu vlevo kliknete **SQL Editor**
5. Kliknete **New query** a vlozite obsah souboru `supabase-schema.sql`
6. Kliknete **Run** - vytvori se 3 tabulky (suppliers, templates, receipts)
7. V menu vlevo kliknete **Settings** > **API**
8. Zkopirujte si dve hodnoty:
   - **Project URL** (napr. `https://xxxxx.supabase.co`)
   - **anon / public key** (dlouhy retezec zacinajici `eyJ...`)

## Krok 2: GitHub (kod)

1. Jdete na **github.com** a vytvorte novy repository (napr. `ekokom-evidence`)
2. Nahrajte do nej vsechny soubory z tohoto projektu
   - Muzete pres web: **Add file** > **Upload files**
   - Nebo pres git:
     ```
     git init
     git add .
     git commit -m "initial"
     git remote add origin https://github.com/VASE-JMENO/ekokom-evidence.git
     git push -u origin main
     ```

## Krok 3: Vercel (hosting)

1. Jdete na **vercel.com** a prihlaste se pres GitHub
2. Kliknete **Add New** > **Project**
3. Vyberte vas repository `ekokom-evidence`
4. V sekci **Environment Variables** pridejte:
   - `VITE_SUPABASE_URL` = vase Project URL ze Supabase
   - `VITE_SUPABASE_ANON_KEY` = vas anon key ze Supabase
5. Kliknete **Deploy**
6. Za ~1 minutu mate aplikaci na adrese `ekokom-evidence.vercel.app`

## Krok 4: Vlastni domena (volitelne)

V Vercel dashboardu > Settings > Domains pridejte svou domenu.

---

## Sdileni s kolegy

Polete kolegum odkaz na vasi Vercel URL. Vsichni pracuji nad stejnou Supabase databazi.
Zadna registrace ani prihlaseni neni potreba (pro interni firemni pouziti).

Pokud chcete omezit pristup, doporucuji pridat Supabase Auth:
- supabase.com/docs/guides/auth

---

## Lokalni vyvoj

```bash
npm install
cp .env.example .env
# Vyplnte VITE_SUPABASE_URL a VITE_SUPABASE_ANON_KEY v .env
npm run dev
```

Aplikace pobezi na http://localhost:5173

---

## Struktura projektu

```
ekokom-app/
  index.html          - HTML vstupni bod
  package.json        - zavislosti (React, Supabase, Vite)
  vite.config.js      - Vite konfigurace
  supabase-schema.sql - SQL pro vytvoreni tabulek
  .env.example        - sablona promennych prostredi
  src/
    main.jsx          - React entry point
    App.jsx           - hlavni aplikace (UI + logika)
    supabase.js       - Supabase klient + DB operace
```
