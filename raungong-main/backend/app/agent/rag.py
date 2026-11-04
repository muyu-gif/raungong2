from pathlib import Path

import jieba
from rank_bm25 import BM25Okapi


class RagStore:
    def __init__(self, knowledge_dir: str):
        self.documents: list[str] = []
        self.tokens: list[list[str]] = []

        root = Path(knowledge_dir)
        if root.exists():
            for path in sorted(root.glob("*.md")):
                text = path.read_text(encoding="utf-8")
                for chunk in text.split("\n## "):
                    chunk = chunk.strip()
                    if chunk:
                        self.documents.append(chunk)
                        self.tokens.append(list(jieba.cut(chunk)))

        self.bm25 = BM25Okapi(self.tokens) if self.tokens else None

    def search(self, query: str, top_k: int = 4) -> str:
        if self.bm25 is None:
            return ""
        scores = self.bm25.get_scores(list(jieba.cut(query)))
        indexes = sorted(
            range(len(scores)),
            key=lambda index: scores[index],
            reverse=True,
        )[:top_k]
        return "\n\n".join(
            self.documents[index]
            for index in indexes
            if scores[index] > 0
        )
