local photos = {}

local MAX_LENGTH <const> = 512 * 1024
local CACHE_SIZE <const> = 64

---@type table<string, string|false>
local cache = {}
---@type string[]
local order = {}

---@param cardId string
---@param photo string|false
local function remember(cardId, photo)
    if cache[cardId] == nil then
        order[#order + 1] = cardId

        if #order > CACHE_SIZE then cache[table.remove(order, 1)] = nil end

    end

    cache[cardId] = photo
end

---@param data any
---@return boolean
function photos.isValid(data)
    if type(data) ~= 'string' or #data > MAX_LENGTH then return false end

    local body = data:match('^data:image/webp;base64,(.+)$') or data:match('^data:image/png;base64,(.+)$')
        or data:match('^data:image/jpeg;base64,(.+)$')

    return body ~= nil and body:find('^[%w%+/]+=*$') ~= nil
end

---@param cardId string
---@return boolean
function photos.exists(cardId)
    if cache[cardId] then return true end

    return MySQL.scalar.await('SELECT 1 FROM `qbx_idcard_photos` WHERE `card_id` = ?', { cardId }) ~= nil
end

---@param cardId string
---@param citizenid string
---@param photo string
---@return boolean
function photos.save(cardId, citizenid, photo)
    if not photos.isValid(photo) then return false end

    MySQL.insert.await(
        'INSERT INTO `qbx_idcard_photos` (`card_id`, `citizenid`, `photo`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `photo` = VALUES(`photo`)',
        { cardId, citizenid, photo }
    )
    remember(cardId, photo)

    return true
end

---@param cardId string
---@return string?
function photos.get(cardId)
    if type(cardId) ~= 'string' or cardId == '' then return end

    local cached = cache[cardId]
    if cached ~= nil then return cached or nil end

    local photo = MySQL.scalar.await('SELECT `photo` FROM `qbx_idcard_photos` WHERE `card_id` = ?', { cardId })
    remember(cardId, type(photo) == 'string' and photo or false)

    return photo
end

return photos
