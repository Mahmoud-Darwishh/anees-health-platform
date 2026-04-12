'use client';

import { useEffect, useMemo, useState } from "react";
import Slider from "react-slick";
import { useTranslations, useLocale } from "next-intl";
import { DoctorCard } from "@/components/doctors/doctorgrid/DoctorCard";
import type { Doctor } from "@/components/doctors/doctorgrid/types";
import doctorsDataEn from "../../doctors/doctorgrid/doctors.en.json";
import doctorsDataAr from "../../doctors/doctorgrid/doctors.ar.json";

interface ArrowProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

const CustomNextArrow: React.FC<ArrowProps> = ({ onClick }) => (
  <div className="spciality-nav nav-bottom owl-nav ">
    <button type="button" role="presentation" className="owl-next" onClick={onClick}>
      <i className="fa-solid fa-chevron-right" />
    </button>
  </div>
);

const CustomPrevArrow: React.FC<ArrowProps> = ({ onClick }) => (
  <div className="spciality-nav nav-bottom owl-nav">
    <button type="button" role="presentation" className="owl-prev" onClick={onClick}>
      <i className="fa-solid fa-chevron-left" />
    </button>
  </div>
);

const SectionDoctor = () => {
  const t = useTranslations("home");
  const locale = useLocale();
  const tg = (key: string, values?: Record<string, string | number>) =>
    t(`doctorGrid.${key}`, values);
  const doctorsData = locale === 'ar' ? doctorsDataAr : doctorsDataEn;
  const isRTL = locale === "ar";
  const [slider, setSlider] = useState<Slider | null>(null);
  const [slidesToShow, setSlidesToShow] = useState<number>(1);
  const featuredDoctors = useMemo(() => doctorsData.slice(0, 6) as Doctor[], [doctorsData]);

  const resolveSlides = useMemo(() => {
    const resolver = (width: number) => {
      if (width >= 1200) return 4;
      if (width >= 992) return 3;
      if (width >= 768) return 2;
      if (width >= 640) return 2;
      return 1;
    };
    return resolver;
  }, []);

  useEffect(() => {
    const handleResize = () => setSlidesToShow(resolveSlides(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [resolveSlides]);

  useEffect(() => {
    if (slider) {
      slider.slickGoTo(0);
    }
  }, [locale, slider, slidesToShow]);

  const Doctoroptions = {
    slidesToShow,
    slidesToScroll: 1,
    dots: false,
    arrows: true,
    nextArrow: <CustomNextArrow />,
    prevArrow: <CustomPrevArrow />,
    infinite: true,
    rtl: isRTL,
    initialSlide: 0,
    speed: 500,
    cssEase: "ease-in-out",
    focusOnSelect: false,
    swipe: true,
    swipeToSlide: true,
    touchThreshold: 10,
    touchMove: true,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 4,
          rtl: isRTL,
          swipe: true,
          touchMove: true,
        },
      },
      {
        breakpoint: 992,
        settings: {
          slidesToShow: 3,
          rtl: isRTL,
          swipe: true,
          touchMove: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          rtl: isRTL,
          swipe: true,
          touchMove: true,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 2,
          rtl: isRTL,
          arrows: false,
          swipe: true,
          touchMove: true,
        },
      },
    ],
  };

  return (
    <section className="doctor-section">
      <div className="container">
        <div className="section-header sec-header-one text-center">
          <span className="badge badge-primary">{t("doctors.title")}</span>
          <h2>{t("doctors.subtitle")}</h2>
        </div>
        <div className="doctors-slider slick-margins slick-arrow-center">
          <Slider ref={setSlider} key={locale} {...Doctoroptions}>
            {featuredDoctors.map((doc) => {
              return (
                <div key={doc.id} className="home-doctor-slide">
                  <DoctorCard
                    doctor={doc}
                    locale={locale}
                    tg={tg}
                    useGridColumn={false}
                  />
                </div>
              );
            })}
          </Slider>
        </div>
      </div>
    </section>
  );
};

export default SectionDoctor;


