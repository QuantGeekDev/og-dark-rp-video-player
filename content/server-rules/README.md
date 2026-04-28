---
id: server-rules
title: Server Rules
order: 0
updated: 2026-04-27
summary: The player-facing rulebook for WIP-Dark-RP.
---

# Server Rules

Welcome to WIP-Dark-RP: part crime sim, part city sandbox, part social experiment with too many people holding crowbars. The rules exist to keep scenes playable, not to turn every sidewalk argument into a court transcript.

Use this folder as the source of truth for player-facing rules. It is written in markdown now and structured so it can later power MOTD, scoreboard, onboarding, and staff warning links.

## Rulebook Contract

- Staff enforce the spirit of the rules, not loopholes.
- Mechanics matter. If the game has a system for something, use that system.
- Roleplay crime is allowed. Random chaos is not.
- Losing an item, printer, car, hit, or robbery does not automatically mean someone broke rules.
- If you find an exploit, report it privately. Do not teach the city how to explode itself.

## Categories

- [Philosophy and Enforcement](./00-philosophy-and-enforcement.md)
- [Community Conduct](./01-community-conduct.md)
- [Identity, Chat, and Adverts](./02-identity-chat-and-adverts.md)
- [Core Roleplay, RDM, NLR, and FailRP](./03-core-roleplay-rdm-nlr-failrp.md)
- [Combat, Damage, and Custody](./04-combat-damage-and-custody.md)
- [Crime, Theft, Raids, and Hits](./05-crime-theft-raids-and-hits.md)
- [Bases, Building, Doors, and Signage](./06-bases-building-doors-and-signage.md)
- [Government, Police, Laws, and Mayor](./07-government-police-laws-and-mayor.md)
- [Jobs, Commerce, and Production](./08-jobs-commerce-and-production.md)
- [Economy, Property, and Theft](./09-economy-property-and-theft.md)
- [Vehicles, Streets, and Transport](./10-vehicles-streets-and-transport.md)
- [Organizations, Gangs, and Shared Access](./11-organizations-gangs-and-shared-access.md)
- [Media, Casino, Lootboxes, and Events](./12-media-casino-lootboxes-and-events.md)
- [Staff, Evidence, and Support](./13-staff-evidence-and-support.md)
- [Glossary and Key Numbers](./14-glossary-and-key-numbers.md)

## Mechanic Crosswalk

| Mechanic | Rules | Source |
| --- | --- | --- |
| Chat, adverts, OOC, PM, radio | Identity, Chat, and Adverts | `docs/chat-command-quick-reference.md`, `Code/Chat/` |
| RP names | Identity, Chat, and Adverts | `Code/Player/RoleplayNameRules.cs` |
| RDM, NLR, death loss | Core Roleplay | `Code/Nlr/`, `docs/death-money-drops.md` |
| Police tools and custody | Combat, Government | `docs/police-operations.md`, `Code/Weapons/` |
| Wanted and warrants | Government | `Code/Law/RoleplayWantedRules.cs`, `Code/Law/RoleplayWarrantService.cs` |
| Mayor taxes, grants, lottery, laws | Government | `docs/tax-and-treasury.md` |
| Lockpicks, keypad crackers, raids | Crime, Bases | `guides/11-theft-and-raiding.md`, `Code/Player/Player.Doors.cs` |
| ATM hacking | Crime | `Code/Economy/Bank/AtmHackRules.cs` |
| Bank robbery and stolen gold | Crime | `docs/bank-robbery.md`, `Code/Economy/BankRobbery/` |
| Hitman contracts | Crime | `Code/Hitman/RoleplayHitmanService.cs` |
| Fading doors and keypads | Bases | `docs/fading-doors.md`, `Code/FadingDoors/` |
| Money printers and vaults | Jobs, Economy | `docs/moneyprinter/README.md` |
| Bitcoin miners | Jobs, Economy | `docs/bitcoin-miner/README.md` |
| Weed Grower, Meth Alchemist, drug products | Jobs, Economy | `docs/drug-dealer-economy.md` |
| Mining and refining | Jobs, Economy | `docs/mining/README.md` |
| Pocket and storage | Economy | `docs/pocket-system.md` |
| Vehicles | Vehicles | `docs/vehicles.md`, `Code/Vehicles/` |
| Organizations | Organizations | `guides/27-organizations.md`, `Code/Organizations/` |
| TV, cinema, casino, lootboxes | Media | `docs/tv-youtube/README.md`, `docs/lootboxes.md` |
| Staff and audit trails | Staff | `Code/Admin/`, `Code/Audit/`, `Code/Support/` |

## Research Notes

This rulebook was shaped by common Garry's Mod DarkRP rule patterns, then adapted to the active S&box codebase. References checked while drafting:

- [DankRP rules](https://www.darkrp.com/rules)
- [TSO.gg DarkRP rules](https://wiki.tso.gg/home/rules/darkrp/)
- [Kordu DarkRP rules](https://docs.kordu.gg/rules/gmod/darkrp/)
- [Razz Networks DarkRP rules](https://gmod.razznetworks.com/darkrp/rules)
- [Steam DarkRP main rules guide](https://steamcommunity.com/sharedfiles/filedetails/?id=689155918)
- [Garry's Mod Wiki: New Life Rule](https://gmod.fandom.com/wiki/New_Life_Rule)

Do not copy outside servers into this rulebook. Their rules are fingerprints of their maps, addons, economies, staff culture, and scars. Our rules should describe this game.

## MOTD Integration Notes

Every category file has:

- `id`
- `title`
- `order`
- `updated`
- `summary`
- `mechanics`
- `related`

Future UI should show the summary first, then rule sections. Keep rule ids stable so staff warnings and MOTD links can point to them later.

