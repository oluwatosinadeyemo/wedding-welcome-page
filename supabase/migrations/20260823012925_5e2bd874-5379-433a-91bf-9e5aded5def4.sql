DELETE FROM public.hotel_reservations WHERE full_name IN ('Funmi & K-Cola', 'Ralph', 'Yinka');
UPDATE public.hotel_reservations SET full_name = 'Saheed' WHERE full_name = 'Saheed & Jide';