-- Check how many movies in movie_cards have rating > 7
-- This query shows the count per mood card and total

-- Count movies with rating > 7 per card
SELECT 
    card_id,
    card_type,
    jsonb_array_length(movies) AS total_movies,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(movies) AS movie
        WHERE (movie->>'rating')::numeric > 7
    ) AS movies_with_rating_above_7,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(movies) AS movie
        WHERE (movie->>'rating')::numeric <= 7 OR movie->>'rating' IS NULL
    ) AS movies_with_rating_7_or_below,
    (
        SELECT COUNT(*)
        FROM jsonb_array_elements(movies) AS movie
        WHERE movie->>'rating' IS NULL
    ) AS movies_without_rating
FROM movie_cards
ORDER BY card_id;

-- Total summary across all cards
SELECT 
    SUM(jsonb_array_length(movies)) AS total_movies_all_cards,
    (
        SELECT COUNT(*)
        FROM movie_cards,
        jsonb_array_elements(movie_cards.movies) AS movie
        WHERE (movie->>'rating')::numeric > 7
    ) AS total_movies_rating_above_7,
    (
        SELECT COUNT(*)
        FROM movie_cards,
        jsonb_array_elements(movie_cards.movies) AS movie
        WHERE (movie->>'rating')::numeric <= 7 OR movie->>'rating' IS NULL
    ) AS total_movies_rating_7_or_below,
    (
        SELECT COUNT(*)
        FROM movie_cards,
        jsonb_array_elements(movie_cards.movies) AS movie
        WHERE movie->>'rating' IS NULL
    ) AS total_movies_without_rating;

-- Detailed breakdown: Show all movies with rating <= 7 (for debugging)
SELECT 
    card_id,
    movie->>'title' AS movie_title,
    (movie->>'rating')::numeric AS rating,
    movie->>'year' AS year
FROM movie_cards,
    jsonb_array_elements(movies) AS movie
WHERE (movie->>'rating')::numeric <= 7 OR movie->>'rating' IS NULL
ORDER BY card_id, (movie->>'rating')::numeric NULLS LAST;

