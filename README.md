# qbx_idcard

Physical ID cards for Qbox. The card is a real prop in the player's hand. Its front and back show the character's photo, name, date of birth and card number, so everyone nearby sees it in the world. Nothing pops up on anyone's screen.

- **Show (E):** hold the card up. The player you face gets a close-up of it.
- **Hand over (J):** the other player has to accept (rebind it under Settings > Key Bindings > FiveM). The card then moves into their hand and they can look at it, flip it and hand it back. If they walk away or disconnect, it returns to the owner.
- **Look (F):** close-up camera. Move the mouse to tilt the card and catch the hologram, press Space to flip it to the back.
- The photo is taken when the card is issued and stays on that card.
- The design is a modern state ID: a dark front with security-print lines, a hologram and a machine-readable zone, and a light back with a barcode and the state seal. Each card type has its own accent colour. The badge shows `issuer.emblem` from `configs/server.lua` (the Qbox duck by default), and the seal follows `issuer.state`.

## Requirements

- ox_lib
- oxmysql
- qbx_core
- ox_inventory

The `qbx_idcard_photos` table (`sql/schema.sql`) is created on first start.

## Items

Add to `ox_inventory/data/items.lua`:

```lua
['id_card'] = {
    label = 'Identification Card',
    weight = 10,
    stack = false,
    close = true,
    client = { image = 'nui://qbx_idcard/web/images/id_card.png' },
},

['driver_license'] = {
    label = 'Drivers License',
    weight = 10,
    stack = false,
    close = true,
    client = { image = 'nui://qbx_idcard/web/images/driver_license.png' },
},

['weaponlicense'] = {
    label = 'Weapon License',
    weight = 10,
    stack = false,
    close = true,
    client = { image = 'nui://qbx_idcard/web/images/weaponlicense.png' },
},

['lawyerpass'] = {
    label = 'Lawyer Pass',
    weight = 10,
    stack = false,
    close = true,
    client = { image = 'nui://qbx_idcard/web/images/lawyerpass.png' },
},
```

## Issuing cards

- A blank card (from `/giveitem`, a shop or `starterItems`) is filled in with the character's details and photo the first time it is used.
- `/issueid [id] [card]` (admin) issues a filled card to a player.
- Server export: `exports.qbx_idcard:issueCard(source, 'driver_license')` returns `true` when the card was given.

## Languages

Prompts, notifications, the key binding and the `/issueid` help use ox_lib locales in `locales/`: ar, cs, da, de, en, es, et, fi, fr, it, nl, pl, pt, pt-br, ro, sk, sv, tr. Set the language with `setr ox:locale "de"` in your server.cfg. Card text (titles, agency, legal lines) is set per card in `configs/server.lua`.

## Upgrading from the old qbx_idcard

Drop-in replacement. Nothing else needs to change.

- Same item names: `id_card`, `driver_license`, `weaponlicense`, `lawyerpass`.
- `exports.qbx_idcard:GetMetaLicense(source, items)` and `exports.qbx_idcard:CreateMetaLicense(source, items)` still work, so `qbx_core` starter items and `qbx_cityhall` keep giving cards.
- Card metadata keeps the old fields (`cardtype`, `citizenid`, `firstname`, `lastname`, `birthdate`, `sex`, `nationality`, `badge`), and the inventory tooltip shows the same details.
- Cards players already own keep working. The first time one is used, it gets a card number, and its saved `mugShot` becomes the card photo (a new photo is taken only if it has none).
- The server event `um-idcard:server:sendData` still shows a card.
- `MugShotBase64` is no longer needed.
- Job badges from the old config are not drawn on the new cards.

Card types, text, validity and server distance checks are in `configs/server.lua`. Hand offsets and client distances are in `configs/client.lua`, and the show time is in `configs/shared.lua`.

## Credits

- [Geist](https://vercel.com/font) and [Commit Mono](https://commitmono.com) fonts, SIL Open Font License.
- Duck logo by the [Qbox Project](https://github.com/Qbox-project).
