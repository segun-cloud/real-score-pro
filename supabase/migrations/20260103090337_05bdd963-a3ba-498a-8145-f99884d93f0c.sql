-- Insert preset kits for all sports
INSERT INTO team_kits (sport, name, primary_color, secondary_color, pattern, unlock_cost) VALUES
-- Football presets
('football', 'Classic Red', '#EF4444', '#FFFFFF', 'solid', 0),
('football', 'Royal Blue', '#3B82F6', '#F59E0B', 'solid', 0),
('football', 'Green Machine', '#10B981', '#FFFFFF', 'vertical-stripes', 50),
('football', 'Sunset Orange', '#F97316', '#FBBF24', 'diagonal-stripes', 50),
('football', 'Purple Storm', '#8B5CF6', '#EC4899', 'horizontal-stripes', 100),
('football', 'Black Gold', '#1F2937', '#F59E0B', 'solid', 100),
-- Basketball presets
('basketball', 'Lakers Gold', '#FCD34D', '#7C3AED', 'solid', 0),
('basketball', 'Bulls Red', '#DC2626', '#000000', 'solid', 0),
('basketball', 'Celtic Green', '#16A34A', '#FFFFFF', 'solid', 50),
('basketball', 'Heat Black', '#000000', '#EF4444', 'diagonal-stripes', 100),
-- Tennis presets
('tennis', 'Wimbledon White', '#FFFFFF', '#22C55E', 'solid', 0),
('tennis', 'US Open Blue', '#3B82F6', '#FFFFFF', 'solid', 0),
-- Baseball presets
('baseball', 'Yankees Navy', '#1E3A5F', '#FFFFFF', 'solid', 0),
('baseball', 'Cardinals Red', '#C41E3A', '#FFFFFF', 'solid', 0),
-- Boxing presets
('boxing', 'Champion Gold', '#F59E0B', '#000000', 'solid', 0),
('boxing', 'Knockout Red', '#DC2626', '#FFFFFF', 'solid', 0),
-- Cricket presets
('cricket', 'India Blue', '#0EA5E9', '#F97316', 'solid', 0),
('cricket', 'Australia Gold', '#FBBF24', '#22C55E', 'solid', 0),
-- Ice Hockey presets
('ice-hockey', 'Maple Red', '#DC2626', '#FFFFFF', 'solid', 0),
('ice-hockey', 'Penguins Black', '#000000', '#F59E0B', 'solid', 0),
-- Rugby presets
('rugby', 'All Blacks', '#000000', '#FFFFFF', 'solid', 0),
('rugby', 'Springbok Green', '#16A34A', '#F59E0B', 'solid', 0),
-- American Football presets
('american-football', 'Patriots Navy', '#1E3A5F', '#C41E3A', 'solid', 0),
('american-football', 'Packers Green', '#22C55E', '#FBBF24', 'solid', 0)
ON CONFLICT DO NOTHING;