class TokenManager:
    _blacklist = set()

    @staticmethod
    def is_token_blacklisted(token: str) -> bool:
        return token in TokenManager._blacklist

    @staticmethod
    def blacklist_token(token: str):
        TokenManager._blacklist.add(token)
