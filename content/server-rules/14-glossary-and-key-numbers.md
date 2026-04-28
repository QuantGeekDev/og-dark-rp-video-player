---
id: glossary-and-key-numbers
title: Glossary and Key Numbers
order: 140
updated: 2026-04-27
summary: Quick definitions and current values for common DarkRP terms and OG Dark RP mechanics.
mechanics:
  - glossary
  - key-numbers
related:
  - core-roleplay-rdm-nlr-failrp
  - government-police-laws-and-mayor
  - crime-theft-raids-and-hits
---

# Glossary and Key Numbers

## In One Breath

When someone yells "NLR RDM FailRP AOS KOS" in one sentence, this is the decoder ring.

## Glossary

### Advert

A global roleplay announcement sent with `/advert`. Use it for clear public RP actions that are not already obvious or system-tracked.

### AOS

Arrest on sight. A law role may arrest a player when valid law reason and authority exist.

### ARDM

Attempted random deathmatch. Trying to damage or kill without valid reason, even if the target survives.

### Base

A claimed area controlled through owned/rented doors, clear signs, and valid build rules.

### Counter

Joining a crime scene to stop it because you are law enforcement, involved, defending your property, or connected through a real server system.

### FailRP

Abusing a job, scene, or mechanic in a way that breaks the server's roleplay structure.

### FearRP

A strict "value your life under threat" rule on some servers. OG Dark RP does not use strict global FearRP by default, but reckless life-disregard can still become FailRP in specific scenes.

### IC

In character. Local roleplay, job radio, law radio, `/me`, and most scene communication are IC.

### KOS

Kill on sight. Only valid when a server rule, clear base rule, active scene, or immediate threat permits it. Mayor laws cannot make broad KOS legal as a first response.

### LTARP

Leaving to avoid roleplay. Includes disconnecting, job switching, respawning, killbinding, hiding in spawn, or using menus to avoid active consequences.

### Metagaming

Using information your character should not know, such as Discord callouts, PMs during active scenes, or UI labels as perfect evidence.

### NLR

New Life Rule. After death, do not return to or influence the same death scene. The game also creates personal NLR zones that can block item use and damage.

### OOC

Out of character. `/ooc` is for server talk, questions, and jokes, not live tactical information.

### RDA

Random arrest. Arresting without valid wanted status, warrant, law reason, or police authority.

### RDM

Random deathmatch. Killing or trying to kill without a valid roleplay reason.

### Raid

An attempt to enter, steal from, damage, or contest a specific base or protected area.

### Self-supply

Switching to a shop or supply job to buy items for yourself or your group, then leaving the job.

### Wanted

A police state that marks a player for arrest. It must be based on valid law reason or automatic system consequence.

### Warrant

Law command authorization to search or arrest a target. Search and arrest warrants have distinct roleplay meanings.

## Key Numbers

| Value | Current Number | Source |
| --- | ---: | --- |
| Default wanted duration | 300 seconds | `RoleplayWantedRules.DefaultDurationSeconds` |
| ATM hack wanted duration | 30 seconds | `RoleplayWantedRules.AtmHackDurationSeconds` |
| Default warrant duration | 300 seconds | `RoleplayWarrantService.DefaultDurationSeconds` |
| Law request expiry | 300 seconds | `RoleplayLawRequestRules.ExpirySeconds` |
| Hitman default price | `$1,000` | `HitmanPricingRules.DefaultPrice` |
| Hitman minimum price | `$100` | `HitmanPricingRules.MinPrice` |
| Hitman maximum price | `$50,000` | `HitmanPricingRules.MaxPrice` |
| Mayor custom law limit | 10 laws | `RoleplayLawBoardService.MaxCustomLawCount` |
| Custom law text limit | 200 characters | `RoleplayLawBoardService.MaxLawLength` |
| Death base wallet drop | up to `$750` | `docs/death-money-drops.md` |
| High-wallet death surcharge | 10 percent above `$15,000` | `docs/death-money-drops.md` |
| Player-facing rule update date | 2026-04-27 | this rulebook |

## Notes

- Values can change with balancing. When in doubt, trust the current code and in-game UI.
- Staff should avoid enforcing old values from memory when the code has moved on.
- If a number here conflicts with a live mechanic, file a docs bug and follow the live mechanic until fixed.
