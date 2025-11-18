// Base email template with common styling and structure

export const BASE_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{subject}}</title>
    <style>
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #FFD700 0%, #E6C200 100%);
            padding: 30px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: shimmer 3s ease-in-out infinite;
        }
        @keyframes shimmer {
            0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(30deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(30deg); }
        }
        .header h1 {
            color: #1f2937;
            margin: 0;
            font-size: 28px;
            font-weight: 700;
        }
        .content {
            padding: 40px 30px;
        }
        .content h2 {
            color: #1f2937;
            font-size: 24px;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .content p {
            color: #6b7280;
            font-size: 16px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #FFD700 0%, #E6C200 100%);
            color: #1f2937;
            padding: 16px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            font-size: 16px;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);
            transition: all 0.3s ease;
        }
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 215, 0, 0.4);
        }
        .footer {
            background-color: #f9fafb;
            padding: 30px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .footer p {
            color: #9ca3af;
            font-size: 14px;
            margin: 0;
        }
        .footer a {
            color: #FFD700;
            text-decoration: none;
        }
        .divider {
            height: 1px;
            background: linear-gradient(90deg, transparent, #e5e7eb, transparent);
            margin: 30px 0;
        }
        .info-box {
            background-color: #f3f4f6;
            border-left: 4px solid #FFD700;
            padding: 20px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
        }
        .info-box p {
            margin: 0;
            color: #374151;
        }
        @media (max-width: 600px) {
            .container {
                margin: 10px;
                border-radius: 8px;
            }
            .header, .content, .footer {
                padding: 20px;
            }
            .header h1 {
                font-size: 24px;
            }
            .content h2 {
                font-size: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Peaceful Investment</h1>
        </div>
        <div class="content">
            {{content}}
        </div>
        <div class="footer">
            <p>
                This email was sent by <strong>Peaceful Investment</strong><br>
                If you have any questions, please contact us at 
                <a href="mailto:support@peacefulinvestment.com">support@peacefulinvestment.com</a>
            </p>
            <p style="margin-top: 15px; font-size: 12px;">
                © 2024 Peaceful Investment. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
`;

export interface TemplateVariables {
  subject: string;
  content: string;
  [key: string]: any;
}

export function renderTemplate(template: string, variables: TemplateVariables): string {
  let rendered = template;
  
  Object.keys(variables).forEach(key => {
    const placeholder = `{{${key}}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), variables[key]);
  });
  
  return rendered;
}
