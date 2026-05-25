import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const slides = [
  {
    id: 1,
    title: 'Mùa Tựu Trường Sôi Động',
    subtitle: 'Khám phá bộ sưu tập dụng cụ học tập mới nhất với ưu đãi hấp dẫn.',
    image: 'https://images.unsplash.com/photo-1497636577773-f1231844b336?w=1200&q=80',
    color: 'from-violet-500 to-indigo-600',
  },
  {
    id: 2,
    title: 'Sổ Tay Cao Cấp',
    subtitle: 'Nâng niu từng nét chữ với chất liệu giấy thượng hạng.',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=1200&q=80',
    color: 'from-emerald-500 to-teal-600',
  },
  {
    id: 3,
    title: 'Góc Làm Việc Sáng Tạo',
    subtitle: 'Tạo cảm hứng mỗi ngày với những vật dụng nhỏ xinh đầy màu sắc.',
    image: 'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=1200&q=80',
    color: 'from-amber-500 to-orange-600',
  }
];

export function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => setCurrent((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  const prevSlide = () => setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  return (
    <div className="relative w-full h-[300px] md:h-[450px] rounded-3xl overflow-hidden mb-10 shadow-2xl group border border-white/50">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-0"
        >
          <img src={slides[current].image} alt={slides[current].title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
          
          <div className="absolute inset-0 flex flex-col justify-center p-8 md:p-16 w-full lg:w-2/3">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight drop-shadow-lg">
                {slides[current].title}
              </h2>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <p className="text-lg md:text-2xl text-slate-200 mb-10 drop-shadow-md font-medium max-w-xl">
                {slides[current].subtitle}
              </p>
            </motion.div>
            
            <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.7, duration: 0.6 }}
            >
              <Link to="/">
                <button className={`px-8 py-4 rounded-full text-white font-bold bg-gradient-to-r ${slides[current].color} hover:scale-105 transition-all duration-300 shadow-xl w-fit flex items-center gap-2`}>
                  Khám phá ngay <ChevronRight className="w-5 h-5" />
                </button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      <button onClick={prevSlide} className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/30 hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg z-10">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={nextSlide} className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:bg-white/30 hover:scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg z-10">
        <ChevronRight className="w-6 h-6" />
      </button>
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        {slides.map((_, index) => (
          <button 
            key={index} 
            onClick={() => setCurrent(index)}
            className={`h-2.5 rounded-full transition-all duration-500 shadow-md ${index === current ? 'bg-white w-10' : 'bg-white/50 w-2.5 hover:bg-white/80'}`}
          />
        ))}
      </div>
    </div>
  );
}
