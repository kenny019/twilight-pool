import Button from "@/components/button";
import { Text } from "@/components/typography";
import React from "react";
import { ChevronRight, Loader2, Plus } from "lucide-react";

const ButtonComponentPage = () => {
  return (
    <div className="space-y-4">
      <Text heading="h1">Button</Text>
      <Button>Primary Button</Button>
      <Button>
        <Plus className="h-5 w-5" /> Primary With Icon
      </Button>
      <Button disabled>Primary Disabled</Button>
      <Button size="small">Small Primary</Button>
      <Button size="small">
        Small Primary With Icon <ChevronRight className="h-4 w-4" />
      </Button>
      <Button size="small" disabled>
        Small Primary Disabled
      </Button>
      <Button variant="secondary">Secondary Button</Button>
      <Button variant="secondary">
        <Plus className="h-5 w-5" /> Secondary With Icon
      </Button>
      <Button variant="secondary" disabled>
        Secondary Disabled
      </Button>
      <Button variant="secondary" size="small">
        Small Secondary
      </Button>
      <Button variant="secondary" size="small">
        Small Secondary With Icon <ChevronRight className="h-4 w-4" />
      </Button>
      <Button variant="secondary" size="small" disabled>
        Small Secondary Disabled
      </Button>
      <Button variant="link">Link Button</Button>
      <Button variant="link" disabled>
        Link Button Disabled
      </Button>
      <section>
        <Text>Icon Button</Text>
        <Button variant="icon" size="icon">
          <ChevronRight />
        </Button>
      </section>
      <section>
        <Text>Disabled Icon Button</Text>
        <Button variant="icon" size="icon" disabled>
          <ChevronRight />
        </Button>
      </section>
      <section>
        <Text>Loading</Text>
        <Button disabled>
          <Loader2 className="h-5 w-5 animate-spin" /> Processing
        </Button>
      </section>
    </div>
  );
};

export default ButtonComponentPage;
