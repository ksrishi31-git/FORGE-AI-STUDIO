"use client";

import { motion, type Easing, type Variants } from "framer-motion";
import dynamic from "next/dynamic";

import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardOverview } from "../use-dashboard";
import { ActiveAgents } from "./active-agents";
import { ActivityTimeline } from "./activity-timeline";
import { HeroSection } from "./hero-section";
import { QuickActions } from "./quick-actions";
import { RecentProjects } from "./recent-projects";
import { StatCards } from "./stat-cards";

/** Charts are code-split so the recharts chunk loads only when needed (FAD §10). */
const ChartsSection = dynamic(() => import("./charts-section").then((m) => m.ChartsSection), {
  ssr: false,
  loading: () => (
    <div className="grid gap-3 lg:grid-cols-3" aria-hidden="true">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  ),
});

const EASE: Easing = "easeOut";

const sectionVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
};

/** Enterprise dashboard (FAD §7 — Dashboard). */
export function DashboardPage() {
  const overview = useDashboardOverview();
  const isLoading = overview.isPending;
  const data = overview.data;
  const refetch = () => void overview.refetch();

  return (
    <div className="space-y-6">
      <motion.section variants={sectionVariants} initial="hidden" animate="visible">
        <HeroSection overview={data} />
      </motion.section>

      <motion.section
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.04 }}
      >
        <StatCards stats={data?.stats} isLoading={isLoading} error={data?.errors.stats ?? false} />
      </motion.section>

      <motion.section
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.08 }}
      >
        <QuickActions />
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.12 }}
          className="space-y-6 lg:col-span-2"
        >
          <RecentProjects
            projects={data?.projects ?? []}
            isLoading={isLoading}
            error={data?.errors.projects ?? false}
            onRetry={refetch}
          />
          <ActiveAgents
            agents={data?.agents ?? []}
            isLoading={isLoading}
            error={data?.errors.agents ?? false}
            onRetry={refetch}
          />
        </motion.div>

        <motion.div
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.16 }}
        >
          <ActivityTimeline
            events={data?.activity ?? []}
            isLoading={isLoading}
            error={data?.errors.activity ?? false}
            onRetry={refetch}
          />
        </motion.div>
      </div>

      <motion.section
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.2 }}
      >
        <ChartsSection
          data={data}
          isLoading={isLoading}
          error={data?.errors.charts ?? false}
          onRetry={refetch}
        />
      </motion.section>
    </div>
  );
}
