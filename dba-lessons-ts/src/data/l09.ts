import type { Item } from "../types";
import { lesson } from "./build.js";

export const l09: Item[] = [
  lesson("Lecture 9 · Vector databases", "Vector databases", "Embeddings and similarity search", "APPLICATION", 9,
    [["tx", "l", "Text or image", "raw data"], ["em", "c", "Embedding", "list of numbers"], ["vd", "d", "Vector DB", "stores vectors"], ["sr", "s", "Search", "nearest vectors"], ["rs", "l", "Result", "similar items"]],
    [
      ["Unstructured data", "Most new data is text, images and audio. SQL LIKE only finds the exact word, so it cannot match puppy for dog.", "Keyword search misses meaning.", "tx"],
      ["Make embeddings", "An ML model turns each item into a vector, a list of numbers. Similar meanings end up close together.", "king - man + woman is close to queen.", "em", "tx>em", "EMBED", "Make a vector"],
      ["Store vectors", "A vector database stores the embeddings and builds indexes so searches are fast.", "Examples: Pinecone, Milvus, Qdrant, Chroma, or Oracle.", "vd", "em>vd", "INSERT", "Store vector"],
      ["Similarity search", "A query is embedded too, and the database finds the nearest vectors (KNN) using Euclidean distance, cosine similarity or dot product.", "Cosine compares direction, not length.", "sr", "vd>sr", "KNN", "Nearest vectors"],
      ["Uses", "Recommendations, chatbot context retrieval (RAG), fraud detection, medical image search and anomaly detection.", "RAG = find relevant text first, then answer.", "rs", "sr>rs", "RESULT", "Similar items", "res"],
    ]),
];