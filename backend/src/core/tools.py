TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "run_research",
            "description": (
                "Run parallel market intelligence research across intelligence domains. "
                "Call when: user wants to research a product, market, or competitor, "
                "or when starting a campaign with no existing research summary. "
                "Leave `domains` empty to let the supervisor auto-detect from the query. "
                "Use `depth` only when the user explicitly asks for quick or deep research."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "domains": {
                        "type": "array",
                        "items": {
                            "type": "string",
                            "enum": [
                                "market", "competitor", "win_loss", "pricing",
                                "positioning", "adjacent", "channel", "contextual", "intent"
                            ]
                        },
                        "description": "Domains to research. Leave empty for auto-detection."
                    },
                    "depth": {
                        "type": "string",
                        "enum": ["quick", "deep"],
                        "description": "quick = 3 sources, deep = 8+. Only set if user explicitly asks. Default: quick."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_email_sequence",
            "description": (
                "Generate a cold email sequence (2 A/B variants × 3-5 touches) "
                "grounded in research signals. "
                "Call when user asks for: email, cold outreach, sequence, follow-ups."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "angle": {
                        "type": "string",
                        "description": "Signal to lead with. If empty, use strongest research signal."
                    },
                    "variant_count": {
                        "type": "integer",
                        "description": "Number of A/B variants. Default 2."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_email_and_linkedin_outreach",
            "description": (
                "Generate a combined cold email sequence AND a LinkedIn DM outreach sequence "
                "(2 A/B variants) grounded in research signals. "
                "Call when user asks for a multi-channel outreach sequence (Email + LinkedIn)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "angle": {"type": "string", "description": "Which signal to build the sequence around."},
                    "variant_count": {"type": "integer", "description": "Number of A/B variants. Default 2."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_linkedin_outreach",
            "description": (
                "Generate a LinkedIn DM outreach sequence (2 A/B variants) "
                "grounded in research signals. "
                "Call when user specifically asks for LinkedIn outreach or DMs (not posts)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "angle": {"type": "string", "description": "Which signal to build the sequence around."},
                    "variant_count": {"type": "integer", "description": "Number of A/B variants. Default 2."}
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_linkedin_post",
            "description": (
                "Generate a LinkedIn post grounded in a specific research signal. "
                "Call when user asks for: LinkedIn post, social post, content for LinkedIn."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "angle": {"type": "string", "description": "Which signal to build the post around."},
                    "format": {
                        "type": "string",
                        "enum": ["insight_post", "contrarian_take", "data_story", "hook_list"],
                        "description": "Post format. Default: insight_post"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_battle_card",
            "description": (
                "Generate a visual battle card comparing product vs competitor. "
                "Call when user asks for: battle card, comparison, vs competitor."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "competitor": {
                        "type": "string",
                        "description": "Competitor to compare against. Use strongest from research if empty."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_flyer",
            "description": (
                "Generate a downloadable flyer or one-pager. "
                "Call when user asks for: flyer, one-pager, visual, infographic, PDF."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "format": {
                        "type": "string",
                        "enum": ["comparison_flyer", "feature_flyer", "campaign_brief"],
                        "description": "Default: comparison_flyer"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_all_assets",
            "description": (
                "Generate the COMPLETE campaign asset set: "
                "email sequence + LinkedIn post + battle card + flyer. "
                "Call ONLY when user EXPLICITLY asks for everything, full campaign, or all assets."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "primary_angle": {
                        "type": "string",
                        "description": "Primary angle to thread through all assets."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "refine_output",
            "description": (
                "Modify existing generated content based on user feedback. "
                "Call when user says: make shorter, change angle, rewrite, "
                "lead with X, make it more direct, try a different hook."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "target": {
                        "type": "string",
                        "enum": ["email", "linkedin_post", "flyer", "battle_card", "variant_a", "variant_b", "all"],
                        "description": "Which output to refine."
                    },
                    "instruction": {
                        "type": "string",
                        "description": "Exactly what to change."
                    }
                },
                "required": ["instruction"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "process_feedback",
            "description": (
                "Process engagement metrics, extract confirmed learning, save to campaign memory. "
                "Call when user provides: open rates, reply rates, meeting counts, or says which variant won."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "variant_a_metrics": {
                        "type": "object",
                        "description": "e.g. {open_rate: 34, reply_rate: 8.2, meetings: 12}"
                    },
                    "variant_b_metrics": {
                        "type": "object",
                        "description": "e.g. {open_rate: 28, reply_rate: 2.9, meetings: 3}"
                    },
                    "winner": {
                        "type": "string",
                        "enum": ["A", "B", "neither"],
                        "description": "Which variant performed better."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_prospects",
            "description": (
                "Search for live profiles matching the target segment using a specific strategy. "
                "Run this first to build an audience before any outreach."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "segment": {
                        "type": "string",
                        "description": "Who to target (e.g., VP Sales, Series B Founders)"
                    },
                    "strategy": {
                        "type": "string",
                        "enum": ["linkedin_search", "competitor_customers", "hiring_signals", "funding_events"],
                        "description": "The strategy to use to find prospects."
                    },
                    "competitor": {
                        "type": "string",
                        "description": "The competitor name (if strategy requires it)."
                    }
                },
                "required": ["segment", "strategy"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "launch_campaign",
            "description": (
                "Push approved prospects and drafted messages to the background worker to send invites. "
                "Only call when approved_prospects_count > 0 AND has_drafted_messages is true."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "check_outreach_status",
            "description": (
                "Query live Postgres stats for the current campaign. "
                "Returns sent, opened, replied counts and open/reply rates. "
                "Call when user asks: how is the campaign doing, what are the open rates, "
                "any replies yet, campaign status."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_competitive_map",
            "description": (
                "Generates a competitive map visualization. "
                "Call when user asks about the 'landscape', 'positioning', 'where we stand', 'map', 'visual', 'plot', or 'graph'."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_asset",
            "description": "Re-display a previously generated asset (email sequence, battle card, or flyer) in the UI.",
            "parameters": {
                "type": "object",
                "properties": {
                    "asset_key": {
                        "type": "string",
                        "enum": ["email_sequence", "battle_card", "flyer", "linkedin_post"],
                        "description": "The key of the asset to show."
                    }
                },
                "required": ["asset_key"]
            }
        }
    },
]