'use client';

import { forwardRef, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type SliderType from "react-slick";
import type { Settings } from "react-slick";
import { useTranslations, useLocale } from "next-intl";
import { DoctorCard } from "@/features/doctors/components/doctorgrid/DoctorCard";
import type { Doctor } from "@/features/doctors/components/doctorgrid/types";
import { Reveal } from "@/components/common/Reveal";
import { useCarouselAutoplay } from "@/hooks/useCarouselAutoplay";

// react-slick is ~40 KB min+gz and the Doctor section is below the fold.
// Defer it (and its CSS) until the route actually renders the carousel.
// next/dynamic doesn't forward refs, so wrap with forwardRef so `ref={setSlider}`
// continues to receive the underlying Slider instance.
const DynamicSlider = dynamic(() => import("react-slick"), { ssr: false }) as unknown as React.ComponentType<Settings & { children?: React.ReactNode; ref?: React.Ref<SliderType> }>;
const Slider = forwardRef<SliderType, Settings & { children?: React.ReactNode }>(
  function SliderWithRef(props, ref) {
    return <DynamicSlider {...props} ref={ref ?? undefined} />;
  }
);

const AUTOPLAY_MS = 5000;
const RESUME_DELAY_MS = 4000;

interface SectionDoctorProps {
  doctors: Doctor[];
}

const SectionDoctor = ({ doctors }: SectionDoctorProps) => {
  const t = useTranslations("home");
  const locale = useLocale();
  const tg = (key: string, values?: Record<string, string | number>) =>
    t(`doctorGrid.${key}`, values);
  const isRTL = locale === "ar";
  const [slider, setSlider] = useState<SliderType | null>(null);
  const [slidesToShow, setSlidesToShow] = useState<number>(1);
  const featuredDoctors = useMemo(() => doctors.slice(0, 6), [doctors]);

  const resolveSlides = useMemo(() => {
    const resolver = (width: number) => {
      if (width >= 1200) return 4;
      if (width >= 992) return 3;
      if (width >= 768) return 2;
      if (width >= 480) return 2;
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

  // Shared autoplay coordination — drives slick imperatively via slickNext so
  // we get the same pause-on-hover / pause-on-tab-hidden / reduced-motion
  // semantics as Packages and PatientStories.
  const advance = useCallback(() => {
    slider?.slickNext();
  }, [slider]);
  const { pause, scheduleResume } = useCarouselAutoplay({
    total: featuredDoctors.length,
    autoplayMs: AUTOPLAY_MS,
    resumeDelayMs: RESUME_DELAY_MS,
    enabled: featuredDoctors.length > slidesToShow,
    onAdvance: advance,
  });

  const Doctoroptions = {
    slidesToShow,
    slidesToScroll: 1,
    dots: false,
    arrows: false,
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
          swipe: true,
          touchMove: true,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          rtl: isRTL,
          swipe: true,
          touchMove: true,
        },
      },
    ],
  };

  return (
    <Reveal as="section" className="doctor-section">
      <div className="container">
        <div className="section-header sec-header-one text-center">
          <span className="badge badge-primary">{t("doctors.title")}</span>
          <h2>{t("doctors.subtitle")}</h2>
        </div>
        <div
          className="doctors-slider slick-margins slick-arrow-center"
          onMouseEnter={pause}
          onMouseLeave={() => scheduleResume()}
          onFocus={pause}
          onBlur={() => scheduleResume()}
          onTouchStart={pause}
          onTouchEnd={() => scheduleResume()}
        >
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
          <div className="owl-nav nav-bottom">
            <button
              type="button"
              aria-label="Previous"
              className="owl-prev"
              onClick={() => {
                pause();
                slider?.slickPrev();
                scheduleResume();
              }}
            >
              <i className="feather-chevron-left" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next"
              className="owl-next"
              onClick={() => {
                pause();
                slider?.slickNext();
                scheduleResume();
              }}
            >
              <i className="feather-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Reveal>
  );
};

export default SectionDoctor;


