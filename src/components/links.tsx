import {
  ActionIcon,
  type ActionIconProps,
  Anchor,
  type AnchorProps,
  NavLink,
  type NavLinkProps,
} from "@mantine/core";
import { createLink } from "@tanstack/react-router";
import { forwardRef } from "react";

type AnchorActionIconProps = ActionIconProps &
  Omit<React.ComponentPropsWithoutRef<"a">, keyof ActionIconProps>;

const AnchorActionIcon = forwardRef<HTMLAnchorElement, AnchorActionIconProps>(
  (props, ref) => <ActionIcon component="a" ref={ref} {...props} />,
);

/**
 * Mantine ActionIcon that is a typed router link (`to`, `params` are checked).
 * `<ActionIcon component={Link}>` loses those types, so wrap it with createLink.
 */
export const LinkActionIcon = createLink(AnchorActionIcon);

const AnchorLink = forwardRef<
  HTMLAnchorElement,
  AnchorProps & Omit<React.ComponentPropsWithoutRef<"a">, keyof AnchorProps>
>((props, ref) => <Anchor component="a" ref={ref} {...props} />);

/** Mantine Anchor that is a typed router link. Same reason as LinkActionIcon. */
export const LinkAnchor = createLink(AnchorLink);

const AnchorNavLink = forwardRef<
  HTMLAnchorElement,
  NavLinkProps & Omit<React.ComponentPropsWithoutRef<"a">, keyof NavLinkProps>
>((props, ref) => <NavLink component="a" ref={ref} {...props} />);

/** Mantine NavLink (side-nav row) that is a typed router link. */
export const LinkNavLink = createLink(AnchorNavLink);
