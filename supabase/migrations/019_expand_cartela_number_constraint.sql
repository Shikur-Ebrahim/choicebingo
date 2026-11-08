-- Migration 019: Expand cartela_number check constraint to allow numbers up to 150 safely (or 500)
ALTER TABLE bingo_players DROP CONSTRAINT IF EXISTS bingo_players_cartela_number_check;
ALTER TABLE bingo_players ADD CONSTRAINT bingo_players_cartela_number_check CHECK (cartela_number >= 1 AND cartela_number <= 500);
