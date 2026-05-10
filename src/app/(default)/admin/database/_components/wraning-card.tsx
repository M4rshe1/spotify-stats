"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

const WARNING_CARD_OPEN_KEY = "warning-card-open";

export function WarningCard() {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    setIsOpen(localStorage.getItem(WARNING_CARD_OPEN_KEY) !== "true");
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem(WARNING_CARD_OPEN_KEY, "true");
  };

  return isOpen ? (
    <Card className="bg-warning/70 border-warning">
      <CardHeader>
        <CardTitle>Warning</CardTitle>
        <CardDescription className="text-warning-foreground">
          The database studio is a tool that lets you explore and edit the
          database. It is not recommended to use this tool if you not know what
          you are doing. Changes you make here may break the app.
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button variant="outline" size="xs" onClick={handleClose}>
          Don't show again
        </Button>
      </CardFooter>
    </Card>
  ) : null;
}
