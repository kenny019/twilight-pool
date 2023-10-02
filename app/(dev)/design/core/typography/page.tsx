import { Text } from "@/components/typography";
import React from "react";

const typographyExample = "The quick brown fox jumped over the lazy dog.";

const TypographyPage = () => {
  return (
    <div className="space-y-4">
      <Text heading="h1">Typography</Text>
      <Text className="text-accent-400 dark:text-accent-300">
        Pre-defined typographic styles
      </Text>
      {(["h1", "h2", "h3"] as const).map((val) => (
        <section key={val}>
          <Text heading="h3">{val}</Text>
          <Text key={val} heading={val}>
            {typographyExample}
          </Text>
        </section>
      ))}
      {(["h1", "h2", "h3"] as const).map((val) => (
        <section key={val}>
          <Text heading="h3">{val}</Text>
          <Text feature key={val} heading={val}>
            {typographyExample}
          </Text>
        </section>
      ))}
      <section>
        <Text heading="h2">Default text</Text>
        <Text>The quick brown fox jumped over the lazy dog.</Text>
      </section>
    </div>
  );
};

export default TypographyPage;
