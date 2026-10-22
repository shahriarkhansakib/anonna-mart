import { motion } from "framer-motion";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WelcomeScreenProps {
  imageUrl: string;
  title: React.ReactNode;
  description: string;
  buttonText: string;
  onButtonClick: () => void;
  secondaryActionText?: React.ReactNode;
  onSecondaryActionClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.2 } },
};

export const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 15 },
  },
};

export const imageVariants = {
  hidden: { y: -50, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring" as const, duration: 0.8 } },
};

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  imageUrl,
  title,
  description,
  buttonText,
  onButtonClick,
  secondaryActionText,
  onSecondaryActionClick,
  className,
  children,
}) => (
  <div
    className={cn(
      "flex h-full w-full flex-col items-center justify-between bg-background",
      className,
    )}
  >
    <motion.div
      className="relative w-full"
      initial="hidden"
      animate="visible"
      variants={imageVariants}
    >
      <img
        src={imageUrl}
        alt="Welcome"
        width={1280}
        height={1024}
        className="h-auto w-full object-cover"
        style={{ clipPath: "ellipse(100% 60% at 50% 40%)" }}
      />
    </motion.div>

    <motion.div
      className="flex flex-1 flex-col items-center justify-center space-y-4 px-8 pt-2 text-center"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {children}
      <motion.h1
        className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl"
        variants={itemVariants}
      >
        {title}
      </motion.h1>
      <motion.p className="max-w-md text-muted-foreground" variants={itemVariants}>
        {description}
      </motion.p>
    </motion.div>

    <motion.div
      className="w-full space-y-3 p-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div variants={itemVariants}>
        <Button
          onClick={onButtonClick}
          className="h-12 w-full border-0 gradient-primary text-primary-foreground shadow-glow hover:opacity-90"
          size="lg"
        >
          {buttonText}
        </Button>
      </motion.div>
      {secondaryActionText && onSecondaryActionClick && (
        <motion.div variants={itemVariants} className="text-center">
          <Button
            variant="link"
            onClick={onSecondaryActionClick}
            className="text-sm text-muted-foreground"
          >
            {secondaryActionText}
          </Button>
        </motion.div>
      )}
    </motion.div>
  </div>
);
