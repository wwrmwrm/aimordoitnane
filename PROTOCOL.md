# Archive protocol

This is a fictional cryptographic puzzle archive, not a security product.

The root page is discoverable as aimordoitnane, the reversed initial word. The hash route `#/w/<24 lowercase hex>` selects an artifact. Every artifact has a public prompt and an AES-256-GCM sealed receipt. Successful answers reveal further routes; file enumeration can reveal prompts but cannot produce authentic receipts.

Answers use Unicode lowercase, trim and collapse whitespace runs to one ASCII space, then UTF-8. Puzzles constrain answers to ASCII. PBKDF2-HMAC-SHA256 derives 32 bytes using the artifact's 16-byte salt and 180000 iterations. AES-GCM uses a 12-byte IV, code (e.g. M01) as UTF-8 additional authenticated data, and a 128-bit tag appended to ciphertext. Seal plaintext is UTF-8 JSON. The viewer uses the browser Web Crypto API; serve on HTTPS or localhost.

All necessary evidence is in this repository and full Git history including tags and undertow. A source ZIP omits historical clues. Player progress contains only opened artifacts and receipts; no answer is stored. Import/export is local. Avoid importing another player's ledger if you want an independent solve.

ENA-1 is a deliberately invented reversible puzzle cipher specified in an artifact. It is not suitable for protecting real secrets. Git archive branches are constructed fiction and keep no claim of real historical provenance.

Root sitemap and robots permission improve discoverability but cannot force search engine indexing or ranking. Only the landing page is advertised in the sitemap. GitHub repository search by name is an independent entry route.

`docs/indexnow-key.txt` is ownership metadata for a search-engine crawl notification. It is infrastructure, not a puzzle clue or a witness receipt.

Optional hidden witnesses extend the ending but are not needed to solve the 24 main witnesses. Receipt codes establish canonical order, not a mandatory traversal order. Existing receipts can be replayed offline; there is no leaderboard or trust claim for imported evidence.
