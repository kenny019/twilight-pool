import { Text } from "@/components/typography";
import React from "react";

const DesignPage = () => {
  return (
    <div className="space-y-4">
      <Text heading="h1">Twilight UI</Text>
      <section>
        <Text heading="h2">Tailwind UI Components for Twilight</Text>
        <Text>
          This is a high-level UI component overview. It is designed to be used
          with Tailwind CSS utility classes.
        </Text>
      </section>
      <Text className="text-accent-400 dark:text-accent-300">
        ⚠️ This is still a work in progress ⚠️
      </Text>
      <section>
        <Text heading="h3">Features</Text>
        <li>
          <Text className="inline-block">Full typesafety with Typescript</Text>
        </li>
        <li>
          <Text className="inline-block">
            Designed with Tailwind compatiblity
          </Text>
        </li>
        <li>
          <Text className="inline-block">Open sourced</Text>
        </li>
      </section>
    </div>
  );
};

export default DesignPage;
