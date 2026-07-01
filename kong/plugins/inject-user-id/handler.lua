local jwt_decoder = require "kong.plugins.jwt.jwt_parser"

local InjectUserIdHandler = {
  PRIORITY = 900, -- precisa rodar DEPOIS do plugin jwt (que valida)
  VERSION = "1.0.0",
}

function InjectUserIdHandler:access(conf)
  local auth_header = kong.request.get_header("authorization")
  if not auth_header then
    return
  end

  local token = auth_header:gsub("Bearer ", "")
  local jwt, err = jwt_decoder:new(token)

  if not err and jwt and jwt.claims and jwt.claims.sub then
    kong.service.request.set_header("X-User-Id", jwt.claims.sub)
  end
end

return InjectUserIdHandler