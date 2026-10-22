local config = require 'configs.server'
local bridge = require 'bridge.server'
local photos = require 'server.modules.photos'

local qbx = exports.qbx_core

local cards = {}

local YEAR <const> = 365 * 24 * 60 * 60
local PHOTO_EVENT <const> = ('%s:client:photo'):format(cache.resource)

---@type table<integer, true>
local locked = {}

---@param value any
---@param fallback string
---@return string
local function text(value, fallback)
    if type(value) ~= 'string' or value == '' then return fallback end

    return value:sub(1, 40)
end

---@param birthdate any
---@return string
local function formatBirthdate(birthdate)
    if type(birthdate) ~= 'string' then return '-' end

    local y, m, d = birthdate:match('^(%d%d%d%d)%-(%d%d?)%-(%d%d?)')
    if y then return ('%02d/%02d/%s'):format(tonumber(m), tonumber(d), y) end

    return birthdate:sub(1, 10)
end

---@param prefix string
---@return string
local function newCardId(prefix)
    for _ = 1, 20 do
        local id = ('%s%07d'):format(prefix, math.random(0, 9999999))
        if not photos.exists(id) then return id end

    end

    return ('%s%s'):format(prefix, lib.string.random('11111111'))
end

---@param src integer
---@return string?
local function capturePhoto(src)
    local ok, data = pcall(lib.callback.await, PHOTO_EVENT, src)
    if ok and photos.isValid(data) then return data end

end

---@param src integer
---@param name string
---@return table?
function cards.legacyMetadata(src, name)
    local player = config.cards[name] and qbx:GetPlayer(src)
    if not player then return end

    local character = player.PlayerData.charinfo or {}

    return {
        cardtype = name,
        citizenid = player.PlayerData.citizenid,
        firstname = text(character.firstname, 'UNKNOWN'),
        lastname = text(character.lastname, 'UNKNOWN'),
        birthdate = type(character.birthdate) == 'string' and character.birthdate:sub(1, 10) or '-',
        sex = character.gender == 1 and 'F' or 'M',
        nationality = text(character.nationality, 'USA'),
        badge = 'none',
    }
end

---@param src integer
---@param name string
---@return table?
local function newMetadata(src, name)
    local card = config.cards[name]
    local metadata = cards.legacyMetadata(src, name)
    if not metadata then return end

    local issued = os.time()

    metadata.cardId = newCardId(card.prefix)
    metadata.issued = os.date('%m/%d/%Y', issued)
    metadata.expires = os.date('%m/%d/%Y', issued + card.years * YEAR)
    metadata.class = card.class
    metadata.dd = lib.string.random('AAAA1111'):upper()
    metadata.description = ('%s %s'):format(metadata.firstname, metadata.lastname)

    return metadata
end

---@param src integer
---@param name string
---@return boolean
local function issue(src, name)
    local metadata = newMetadata(src, name)
    if not metadata or not bridge.canCarry(src, name, metadata) then return false end

    local photo = capturePhoto(src)
    if not bridge.addItem(src, name, metadata) then return false end

    if photo then photos.save(metadata.cardId, metadata.citizenid, photo) end

    return true
end

---@param src integer
---@param name string
---@param slot integer
---@return boolean
local function blank(src, name, slot)
    local item = bridge.getSlot(src, slot)

    return item ~= nil and item.name == name and not item.metadata.cardId
end

---@param src integer
---@param name string
---@param slot integer
---@return table?
local function stamp(src, name, slot)
    if not blank(src, name, slot) then return end

    local metadata = newMetadata(src, name)
    if not metadata then return end

    local mugShot = bridge.getSlot(src, slot).metadata.mugShot
    local photo = photos.isValid(mugShot) and mugShot or capturePhoto(src)
    if not blank(src, name, slot) then return end

    local merged = bridge.getSlot(src, slot).metadata
    for key, value in pairs(metadata) do merged[key] = value end

    if not bridge.setMetadata(src, slot, merged) then return end

    if photo then photos.save(metadata.cardId, metadata.citizenid, photo) end

    return merged
end

---@param src integer
---@return boolean
function cards.isBusy(src)
    return locked[src] == true
end

---@param name string
---@return boolean
function cards.exists(name)
    return config.cards[name] ~= nil
end

---@param name string
---@return string
function cards.label(name)
    return config.cards[name].label
end

---@param src integer
---@param name string
---@return boolean
function cards.issue(src, name)
    if not config.cards[name] or locked[src] then return false end

    locked[src] = true
    local ok = issue(src, name)
    locked[src] = nil

    return ok
end

---@param src integer
---@param name string
---@param slot integer
---@return table?
function cards.stamp(src, name, slot)
    if locked[src] then return end

    locked[src] = true
    local metadata = stamp(src, name, slot)
    locked[src] = nil

    return metadata
end

---@param name string
---@param metadata table
---@return table
function cards.payload(name, metadata)
    local card = config.cards[name]
    local details = {}

    if card.class then details[#details + 1] = { label = 'CLASS', value = metadata.class or card.class } end

    details[#details + 1] = { label = 'ISSUED', value = metadata.issued }
    details[#details + 1] = { label = 'EXPIRES', value = metadata.expires }

    return {
        theme = card.theme,
        title = card.title,
        subtitle = card.subtitle,
        agency = card.agency,
        legal = card.legal,
        numberLabel = card.numberLabel,
        state = config.issuer.state,
        country = config.issuer.country,
        emblem = config.issuer.emblem,
        number = metadata.cardId,
        firstname = metadata.firstname,
        lastname = metadata.lastname,
        birthdate = formatBirthdate(metadata.birthdate),
        sex = metadata.sex,
        nationality = metadata.nationality,
        issued = metadata.issued,
        expires = metadata.expires,
        class = metadata.class,
        dd = metadata.dd,
        details = details,
    }
end

---@return table<string, true>
function cards.filter()
    local filter = {}

    for name in pairs(config.cards) do filter[name] = true end

    return filter
end

---@param src integer
function cards.drop(src)
    locked[src] = nil
end

return cards
