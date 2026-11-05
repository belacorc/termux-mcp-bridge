# 📱 termux-mcp-bridge

🌐 [English](README.md) · [Русский](README.ru.md) · [Čeština](README.cs.md)

**Dej svému AI asistentovi ruce na tvém Android telefonu.**
Malý [MCP](https://modelcontextprotocol.io) server bez závislostí. Běží v [Termuxu](https://termux.dev) a umožňuje AI klientům jako Claude, ChatGPT nebo Notion AI spouštět příkazy, otevírat aplikace, posílat notifikace, zjišťovat stav baterie, polohu a další. Bez rootu, bez ADB a bez počítače.

```
AI klient ──HTTPS──▶ Cloudflare quick tunnel ──▶ 127.0.0.1:8765 (Termux) ──▶ tvůj telefon
                       (tajná cesta v odkazu)
```

## ✨ Funkce

- **Instalace jedním příkazem.** Nic se nenastavuje a nemusíš zakládat žádné účty.
- **Bez přesměrování portů.** Používá bezplatný Cloudflare quick tunnel, takže funguje na mobilních datech i na jakékoli Wi-Fi.
- **Samoopravování.** Hlídač sám restartuje server a tunel, když spojení spadne.
- **Trvalý odkaz** přes bezplatný Cloudflare Worker (volitelně).
- **Už žádné kopírování odkazů.** Každý nový odkaz tunelu se zveřejní do tvého soukromého kanálu [ntfy](https://ntfy.sh), takže ho AI vždycky najde.
- **Automatické spuštění po restartu** přes Termux:Boot.
- **Žádné npm závislosti.** Zhruba 120 řádků čistého Node.js.

## 🛠 Nástroje

| Nástroj | Co dělá |
|---|---|
| `shell` | Spustí libovolný příkaz v Termuxu |
| `list_apps` | Seznam nainstalovaných aplikací (s filtrem) |
| `open_app` | Otevře aplikaci podle názvu balíčku |
| `open_url` | Otevře odkaz v prohlížeči nebo vhodné aplikaci |
| `notify` | Zobrazí notifikaci |
| `phone_status` | Baterie, nabíjení, teplota, Wi-Fi, hlasitost |
| `location` | Poloha (GPS / síť) |
| `clipboard` | Čtení a zápis schránky |
| `speak` | Přečte text nahlas (TTS) |

**Co AI nezvládne:** vidět obrazovku a klikat v jiných aplikacích, číst zprávy v cizích aplikacích, měnit systémová nastavení (potřebuje root), fungovat bez internetu nebo při vypnutém telefonu.

## 🚀 Instalace

1. Nainstaluj z **F-Droidu** (ne z Google Play):
   - [Termux](https://f-droid.org/packages/com.termux/)
   - [Termux:API](https://f-droid.org/packages/com.termux.api/): potřeba pro notifikace, baterii, polohu, schránku a TTS
   - [Termux:Boot](https://f-droid.org/packages/com.termux.boot/) *(volitelně)*: automatické spuštění. Po instalaci ho jednou otevři.
2. V Termuxu spusť:

```bash
curl -fsSL https://raw.githubusercontent.com/belacorc/termux-mcp-bridge/main/install.sh | bash
```

Instalátor vypíše tvůj **MCP odkaz** a **soukromý ntfy kanál**.

3. Přidej odkaz do AI klienta jako vzdálený MCP server (Streamable HTTP), například:

```json
{ "mcpServers": { "phone": { "url": "https://xxxx.trycloudflare.com/mcp/<token>" } } }
```

### Lokální režim stdio

Spuštění z lokálního MCP klienta uvnitř Termuxu, bez tunelu:

```json
{ "mcpServers": { "phone": { "command": "node", "args": ["/data/data/com.termux/files/home/termux-mcp-bridge/bridge.mjs", "--stdio"] } } }
```

## 🔁 Každodenní použití

```bash
~/termux-mcp-bridge/start.sh   # spustit (po restartu se spouští samo)
~/termux-mcp-bridge/stop.sh    # zastavit
```

Odkaz quick tunelu se mění při každém restartu. Aktuální získáš vždycky takhle:

```bash
curl -s "https://ntfy.sh/<tvůj-kanál>/json?poll=1&since=24h" | tail -n 1
```

Nebo přes pomocníka [`client/phone.sh`](client/phone.sh):

```bash
export BRIDGE_TOPIC=pb-xxxxxxxx
./client/phone.sh phone_status
./client/phone.sh shell '{"command":"uname -a"}'
```

## 🔗 Trvalý odkaz (volitelně, zdarma)

Odkaz tunelu se mění při každém restartu, takže chatovací AI (Claude, ChatGPT) by pokaždé potřebovala nový. Řeší to malý Cloudflare Worker v [`relay/worker.js`](relay/worker.js): přečte aktuální odkaz z tvého ntfy kanálu a přepošle tam požadavky. Tvůj odkaz se tak **už nikdy nezmění**:

```
https://phone.<tvoje-subdoména>.workers.dev/mcp/<token>
```

1. Založ si bezplatný účet Cloudflare a otevři **Workers & Pages → Create → Start with Hello World**. Pojmenuj ho `phone` a dej Deploy.
2. Klikni na **Edit code**, vlož `relay/worker.js` a pak **Deploy**.
3. V **Settings → Variables and Secrets** přidej tajnou proměnnou `TOPIC` s názvem svého ntfy kanálu.
4. Do AI klienta zadej odkaz `https://phone.<tvoje-subdoména>.workers.dev/mcp/<token>`. Token najdeš v `~/.bridge_token`.

Worker přeposílá jen cesty `/mcp/*` a telefon stejně kontroluje token, takže na špatný token přijde 404.

## 🔒 Bezpečnost

> ⚠️ **MCP odkaz = plný přístup k příkazové řádce tvého Termuxu.** Chraň ho jako heslo.

- Server poslouchá jen na `127.0.0.1`. Zvenku se k němu dá dostat jen přes tunel a jen přes tajnou cestu `/mcp/<náhodný 144bitový token>`. Na jakoukoli jinou cestu odpoví 404.
- Token je uložený v `~/.bridge_token`. Když ho chceš změnit, smaž soubor a restartuj most.
- Název ntfy kanálu je taky náhodný a taky je tajný: kdo ho zná, může si přečíst tvůj aktuální odkaz. Nikomu ho nedávej.
- Když most nepotřebuješ, vypni ho přes `stop.sh`.

## 🧩 Soubory

| Soubor | K čemu |
|---|---|
| `bridge.mjs` | Samotný MCP server (JSON-RPC přes HTTP) |
| `up.sh` | Spustí server a tunel, zveřejní odkaz |
| `watchdog.sh` | Kontrola každých 60 s, automatický restart |
| `start.sh` / `stop.sh` | Spustit / zastavit vše |
| `boot.sh` | Skript pro automatické spuštění přes Termux:Boot |
| `install.sh` | Instalátor jedním příkazem |
| `client/phone.sh` | Volání nástrojů z jakéhokoli počítače přes ntfy |
| `relay/worker.js` | Cloudflare Worker pro trvalý odkaz (volitelně) |

## 📄 Licence

MIT © belacorc
