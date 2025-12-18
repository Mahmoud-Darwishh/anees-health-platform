'use client';

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Slider from "react-slick";
import { useTranslations, useLocale } from "next-intl";
import doctorsDataEn from "../../doctors/doctorgrid/doctors.en.json";
import doctorsDataAr from "../../doctors/doctorgrid/doctors.ar.json";

const SectionDoctor: React.FC = () => {
  const t = useTranslations();
  const locale = useLocale();
  const doctorsData = locale === 'ar' ? doctorsDataAr : doctorsDataEn;
  const isRTL = locale === "ar";
  const [slider, setSlider] = useState<any>(null);
  const [slidesToShow, setSlidesToShow] = useState<number>(1);
  const featuredDoctors = useMemo(() => doctorsData.slice(0, 6), [doctorsData]);

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
        <div className="section-header sec-header-one text-center aos" data-reveal>
          <span className="badge badge-primary">{t("home.doctors.title")}</span>
          <h2>{t("home.doctors.subtitle")}</h2>
        </div>
        <div className="doctors-slider slick-margins slick-arrow-center aos" data-reveal>
          <Slider ref={setSlider} key={locale} {...Doctoroptions}>
            {featuredDoctors.map((doc) => (
              <div className="card" key={doc.id}>
                <div className="card-img card-img-hover">
                  <Link href={`/${locale}/doctors/${doc.id}`}>
                    <img src={doc.image} alt={doc.doctorName} loading="lazy" />
                  </Link>
                  {doc.rating ? (
                    <div className="grid-overlay-item d-flex align-items-center justify-content-between">
                      <span className="badge bg-orange">
                        <i className="fa-solid fa-star me-1" />
                        {doc.rating.toFixed(1)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="card-body p-0">
                  <div className={`d-flex active-bar align-items-center justify-content-between p-3`}>
                    <Link href="#" className={`fw-medium fs-14`}>
                      {doc.speciality}
                    </Link>
                    <span className={`bg-success-light badge d-inline-flex align-items-center`}>
                      <i className="fa-solid fa-circle fs-5 me-1" />
                      {doc.availabilityStatus || t("home.doctors.available")}
                    </span>
                  </div>
                  <div className="p-3 pt-0">
                    <div className="doctor-info-detail mb-3 pb-3">
                      <h3 className="mb-1">
                        <Link href={`/${locale}/doctors/${doc.id}`}>{doc.doctorName}</Link>
                      </h3>
                      <div className="d-flex align-items-center">
                        <p className="d-flex align-items-center mb-0 fs-14">
                          <i className="isax isax-location me-2" />
                          {doc.location}
                        </p>
                        <i className="fa-solid fa-circle fs-5 text-primary mx-2 me-1" />
                        <span className="fs-14 fw-medium">{doc.duration}</span>
                      </div>
                    </div>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="mb-1 fs-14">{t("home.doctors.consultation_fees")}</p>
                        <h3 className="text-orange">{doc.consultationFee}</h3>
                      </div>
                      <Link
                        href={`/${locale}/booking?doctor=${doc.id}`}
                        className="btn btn-md btn-dark d-inline-flex align-items-center rounded-pill text-truncate"
                      >
                        {t("home.doctors.book_now")}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      </div>
    </section>
  );
};

export default SectionDoctor;


