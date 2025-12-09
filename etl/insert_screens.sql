-- 부산 영화관 상영관 데이터 (각 영화관당 3~5개 상영관)

-- CGV 서면 (theater_id = 43)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(43, '1관', 240, 'STANDARD'),
(43, '2관', 240, 'STANDARD'),
(43, '3관', 240, 'STANDARD'),
(43, 'IMAX', 240, 'IMAX');

-- CGV 센텀시티 (theater_id = 44)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(44, '1관', 240, 'STANDARD'),
(44, '2관', 240, 'STANDARD'),
(44, '4DX', 240, '4DX'),
(44, 'IMAX', 240, 'IMAX');

-- CGV 대연 (theater_id = 45)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(45, '1관', 240, 'STANDARD'),
(45, '2관', 240, 'STANDARD'),
(45, '3관', 240, 'STANDARD');

-- CGV 해운대 (theater_id = 46)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(46, '1관', 240, 'STANDARD'),
(46, '2관', 240, 'STANDARD'),
(46, '3관', 240, 'STANDARD'),
(46, '4DX', 240, '4DX');

-- CGV 남포 (theater_id = 47)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(47, '1관', 240, 'STANDARD'),
(47, '2관', 240, 'STANDARD'),
(47, '3관', 240, 'STANDARD');

-- CGV 대한 (theater_id = 48)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(48, '1관', 240, 'STANDARD'),
(48, '2관', 240, 'STANDARD');

-- CGV 하단 (theater_id = 49)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(49, '1관', 240, 'STANDARD'),
(49, '2관', 240, 'STANDARD'),
(49, '3관', 240, 'STANDARD');

-- 롯데시네마 센텀시티 (theater_id = 50)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(50, '1관', 240, 'STANDARD'),
(50, '2관', 240, 'STANDARD'),
(50, '3관', 240, 'STANDARD'),
(50, 'SUPER PLEX', 240, 'IMAX');

-- 롯데시네마 서면 (theater_id = 51)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(51, '1관', 240, 'STANDARD'),
(51, '2관', 240, 'STANDARD'),
(51, '3관', 240, 'STANDARD'),
(51, '4관', 240, 'STANDARD');

-- 롯데시네마 동래 (theater_id = 52)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(52, '1관', 240, 'STANDARD'),
(52, '2관', 240, 'STANDARD'),
(52, '3관', 240, 'STANDARD');

-- 롯데시네마 오투 (theater_id = 53)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(53, '1관', 240, 'STANDARD'),
(53, '2관', 240, 'STANDARD'),
(53, '3관', 240, 'STANDARD');

-- 롯데시네마 광복 (theater_id = 54)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(54, '1관', 240, 'STANDARD'),
(54, '2관', 240, 'STANDARD');

-- 롯데시네마 사상 (theater_id = 55)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(55, '1관', 240, 'STANDARD'),
(55, '2관', 240, 'STANDARD'),
(55, '3관', 240, 'STANDARD');

-- 롯데시네마 부산본점 (theater_id = 56)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(56, '1관', 240, 'STANDARD'),
(56, '2관', 240, 'STANDARD'),
(56, '3관', 240, 'STANDARD'),
(56, '4관', 240, 'STANDARD');

-- 메가박스 해운대 (theater_id = 57)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(57, '1관', 240, 'STANDARD'),
(57, '2관', 240, 'STANDARD'),
(57, 'DOLBY', 240, 'DOLBY');

-- 메가박스 장산 (theater_id = 58)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(58, '1관', 240, 'STANDARD'),
(58, '2관', 240, 'STANDARD'),
(58, '3관', 240, 'STANDARD');

-- 메가박스 부산대 (theater_id = 59)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(59, '1관', 240, 'STANDARD'),
(59, '2관', 240, 'STANDARD'),
(59, '3관', 240, 'STANDARD');

-- 메가박스 서면 (theater_id = 60)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(60, '1관', 240, 'STANDARD'),
(60, '2관', 240, 'STANDARD'),
(60, 'MX', 240, 'IMAX');

-- 메가박스 덕천 (theater_id = 61)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(61, '1관', 240, 'STANDARD'),
(61, '2관', 240, 'STANDARD');

-- 메가박스 동래 (theater_id = 62)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(62, '1관', 240, 'STANDARD'),
(62, '2관', 240, 'STANDARD'),
(62, '3관', 240, 'STANDARD');

-- 메가박스 사상 (theater_id = 63)
INSERT INTO screen (theater_id, name, total_seats, screen_type) VALUES
(63, '1관', 240, 'STANDARD'),
(63, '2관', 240, 'STANDARD'),
(63, '3관', 240, 'STANDARD');

-- 총 67개 상영관 생성
-- 각 상영관은 A1~P15 좌석 구조 (16열 x 15석 = 240석)
